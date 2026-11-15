import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { ProductCard } from '@/components/products/ProductCard';
import { ProductFilters } from '@/components/products/ProductFilters';
import { School, Uniform, SchoolClass, FilterGender, FilterCategory, FilterSize } from '@/types';
import { supabase } from '@/lib/supabase';
import { ChevronLeft, SlidersHorizontal, Grid3X3, Grid2X2, LogIn, UserPlus, User, MapPin, ShoppingBag } from 'lucide-react';
import { logError } from '@/lib/errorHandler';
import { useAuth } from '@/contexts/AuthContext';
import { AuthModal } from '@/components/auth/AuthModal';
import { SchoolVerificationDialog } from '@/components/schools/SchoolVerificationDialog';

export default function SchoolPage() {
  const { schoolId } = useParams<{ schoolId: string }>();
  const { user } = useAuth();
  const [school, setSchool] = useState<School | null>(null);
  const [classes, setClasses] = useState<string[]>([]);
  const [uniforms, setUniforms] = useState<Uniform[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [gridCols, setGridCols] = useState<3 | 4>(4);
  const [isVerified, setIsVerified] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);

  // Check verification on load
  useEffect(() => {
    if (schoolId) {
      const verifiedId = sessionStorage.getItem('verified_school');
      if (verifiedId === schoolId) {
        setIsVerified(true);
      }
    }
  }, [schoolId]);

  // Core Selection
  const [selectedClass, setSelectedClass] = useState<string>(() => {
    if (!schoolId) return '';
    return sessionStorage.getItem(`elite_selected_class_${schoolId}`) || '';
  });

  // Persist class selection to session
  useEffect(() => {
    if (schoolId) {
      if (selectedClass) {
        sessionStorage.setItem(`elite_selected_class_${schoolId}`, selectedClass);
      } else {
        sessionStorage.removeItem(`elite_selected_class_${schoolId}`);
      }
    }
  }, [schoolId, selectedClass]);

  // Filters
  const [gender, setGender] = useState<FilterGender>('all');

  useEffect(() => {
    async function fetchSchoolAndClasses() {
      if (!schoolId) return;

      // Fetch school
      const { data: schoolData, error: schoolError } = await supabase
        .from('schools')
        .select('*')
        .eq('id', schoolId)
        .single();

      if (schoolError) logError('FetchSchool', schoolError);
      else setSchool(schoolData);

      // Fetch Classes
      const { data: classesData, error: classesError } = await supabase
        .from('classes')
        .select('grade_name')
        .eq('school_id', schoolId);

      if (classesError) {
        console.error('Error fetching classes:', classesError);
      } else if (classesData) {
        // Sort classes properly: LKG, UKG, 1st, 2nd, ... 12th
        const gradeOrder = ['Nursery', 'LKG', 'UKG', '1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th', '9th', '10th', '11th', '12th'];

        const sortedClasses = Array.from(new Set(classesData.map(c => c.grade_name))).sort((a, b) => {
          const indexA = gradeOrder.indexOf(a);
          const indexB = gradeOrder.indexOf(b);

          if (indexA !== -1 && indexB !== -1) return indexA - indexB;
          if (indexA !== -1) return -1;
          if (indexB !== -1) return 1;

          // Fallback for numeric strings or other formats
          const numA = parseInt(a);
          const numB = parseInt(b);
          if (!isNaN(numA) && !isNaN(numB)) return numA - numB;

          return a.localeCompare(b);
        });

        setClasses(sortedClasses);
      }

      setLoading(false);
    }
    fetchSchoolAndClasses();
  }, [schoolId]);

  // Fetch Uniforms when Class is selected
  useEffect(() => {
    async function fetchUniforms() {
      if (!schoolId) return;
      if (!selectedClass) {
        setUniforms([]);
        return;
      }

      const { data, error } = await supabase
        .from('uniforms')
        .select('*')
        .eq('school_id', schoolId);

      if (error) {
        logError('FetchUniforms', error);
      } else if (data) {
        // Group all uniforms by identity: item_name, type, category (lowercase)
        const itemGroups = new Map<string, Uniform[]>();
        data.forEach(item => {
          const key = `${item.item_name}-${item.type}-${item.category}`.toLowerCase();
          if (!itemGroups.has(key)) {
            itemGroups.set(key, []);
          }
          itemGroups.get(key)!.push(item);
        });

        const deduplicated: Uniform[] = [];

        itemGroups.forEach((rows, key) => {
          // Check if this uniform is applicable to the selected class.
          // It is applicable if there is a row with grade === selectedClass OR grade === 'All'.
          const classSpecificRow = rows.find(r => r.grade === selectedClass);
          const allRow = rows.find(r => r.grade === 'All');

          if (!classSpecificRow && !allRow) {
            // Not applicable to the selected class
            return;
          }

          // The target base row is the class-specific row if it exists, otherwise the 'All' row
          const baseRow = classSpecificRow || allRow!;

          // Now find the best metadata values from ANY row in this group (including master 'All' or sibling classes)
          // to fill any null/empty fields in our base row.
          const findBest = <T,>(extractor: (r: Uniform) => T | null | undefined, isEmpty?: (val: T) => boolean): T | null => {
            // 1. Try base row
            const baseVal = extractor(baseRow);
            if (baseVal !== undefined && baseVal !== null) {
              if (!isEmpty || !isEmpty(baseVal)) return baseVal;
            }

            // 2. Try 'All' row if it exists and is different from baseRow
            if (allRow && allRow.id !== baseRow.id) {
              const allVal = extractor(allRow);
              if (allVal !== undefined && allVal !== null) {
                if (!isEmpty || !isEmpty(allVal)) return allVal;
              }
            }

            // 3. Try any other row in the group
            for (const r of rows) {
              const val = extractor(r);
              if (val !== undefined && val !== null) {
                if (!isEmpty || !isEmpty(val)) return val;
              }
            }

            return null;
          };

          const mergedItem: Uniform = {
            ...baseRow,
            image_url: findBest(r => r.image_url) || baseRow.image_url,
            image_urls: findBest(r => r.image_urls, val => !val || val.length === 0) || baseRow.image_urls,
            colors: findBest(r => r.colors, val => !val || val.length === 0) || baseRow.colors,
            description: findBest(r => r.description) || baseRow.description,
            fabric_info: findBest(r => r.fabric_info) || baseRow.fabric_info,
            fit_description: findBest(r => r.fit_description) || baseRow.fit_description,
            size_config: findBest(r => r.size_config) || baseRow.size_config,
            stock: findBest(r => r.stock, val => !val || Object.keys(val).length === 0) || baseRow.stock,
            description_image_url: findBest(r => r.description_image_url) || baseRow.description_image_url,
          };

          deduplicated.push(mergedItem);
        });

        setUniforms(deduplicated);
      }
    }
    fetchUniforms();
  }, [schoolId, selectedClass]);


  const clearFilters = () => {
    setGender('all');
  };

  const filteredUniforms = uniforms.filter(u => {
    if (gender !== 'all') {
      if (gender === 'Boys') {
        if (u.type !== 'Boys' && u.type !== 'Unisex') return false;
      } else if (gender === 'Girls') {
        if (u.type !== 'Girls' && u.type !== 'Unisex') return false;
      } else if (gender === 'Unisex') {
        if (u.type !== 'Unisex') return false;
      }
    }

    return true;
  });

  if (!school && !loading) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-16 text-center">
          <h1 className="text-2xl font-bold mb-4">School not found</h1>
          <Link to="/" className="text-accent hover:underline">Back to all schools</Link>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="bg-white border-b border-border/50">
        <div className="container mx-auto px-4 py-12">
          <Link to="/" className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors mb-8">
            <ChevronLeft className="w-4 h-4" />
            Back to Schools
          </Link>

          <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-secondary rounded-2xl flex items-center justify-center border border-border/50">
                  <User className="w-6 h-6 text-muted-foreground" />
                </div>
                <div className="px-3 py-1 bg-accent/10 text-accent text-[10px] font-black uppercase tracking-[0.2em] rounded-full">Official Partner</div>
              </div>
              <h1 className="text-4xl md:text-5xl font-black tracking-tight">{school?.name}</h1>
              <div className="flex items-center gap-2 text-muted-foreground">
                <MapPin className="w-4 h-4" />
                <p className="font-medium">{school?.area}, Bangalore</p>
              </div>
            </div>

            {/* Auth buttons */}
            <div className="flex items-center gap-3 bg-secondary/30 p-2 rounded-2xl border border-border/40">
              {user ? (
                <>
                  <div className="flex items-center gap-3 pl-2 pr-4">
                    {user.user_metadata?.avatar_url ? (
                      <img src={user.user_metadata.avatar_url} alt="avatar" className="w-9 h-9 rounded-full object-cover border border-white shadow-soft" />
                    ) : (
                      <div className="w-9 h-9 rounded-xl bg-white flex items-center justify-center border border-border shadow-soft">
                        <User className="w-4 h-4 text-muted-foreground" />
                      </div>
                    )}
                    <div className="flex flex-col">
                      <span className="text-[10px] uppercase tracking-widest font-black text-muted-foreground leading-none mb-1">Authenticated</span>
                      <span className="text-xs font-bold leading-none">{user.user_metadata?.name || user.email?.split('@')[0]}</span>
                    </div>
                  </div>
                  <Link
                    to="/orders"
                    className="h-10 px-4 flex items-center bg-white border border-border rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-secondary transition-all shadow-soft"
                  >
                    My Orders
                  </Link>
                </>
              ) : (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setAuthModalOpen(true)}
                    className="h-10 px-4 text-xs font-bold uppercase tracking-widest hover:text-accent transition-colors"
                  >
                    Sign In
                  </button>
                  <button
                    onClick={() => setAuthModalOpen(true)}
                    className="h-10 px-6 bg-foreground text-background rounded-xl text-xs font-bold uppercase tracking-widest shadow-soft hover:bg-neutral-800 transition-all active:scale-95"
                  >
                    Sign Up
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-16">
        {/* Class Selection */}
        {!selectedClass && (
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-12">
              <span className="text-accent font-black text-[10px] uppercase tracking-[0.3em] mb-4 block">Personalized Catalog</span>
              <h2 className="text-3xl font-black tracking-tight mb-4">Identify Your Class</h2>
              <p className="text-muted-foreground max-w-md mx-auto">Select your child's current grade to see the specific uniform requirements and official colorways.</p>
            </div>

            {loading ? (
              <div className="flex flex-col items-center gap-4 py-20">
                <div className="w-10 h-10 border-4 border-secondary border-t-accent rounded-full animate-spin" />
                <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Synchronizing Grades...</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 md:gap-6">
                {classes.map((clsName) => (
                  <button
                    key={clsName}
                    onClick={() => setSelectedClass(clsName)}
                    className="group relative p-8 bg-white hover:bg-foreground transition-all duration-300 rounded-2xl text-center border border-border shadow-soft hover:shadow-xl hover:-translate-y-1 overflow-hidden"
                  >
                    <div className="absolute top-0 left-0 w-full h-1 bg-accent transform scale-x-0 group-hover:scale-x-100 transition-transform origin-left duration-500" />
                    <span className="block text-2xl font-black group-hover:text-background transition-colors mb-2">{clsName}</span>
                    <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground group-hover:text-background/50 transition-colors">Catalog</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Uniforms Display */}
        {selectedClass && (
          <div className="flex flex-col lg:flex-row gap-12">
            <div className="lg:w-72 flex-shrink-0 animate-fade-in">
              <ProductFilters
                gender={gender}
                onGenderChange={setGender}
                onClear={clearFilters}
                isOpen={filtersOpen}
                onClose={() => setFiltersOpen(false)}
              />
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-10 gap-4 flex-wrap">
                <div className="flex items-center gap-6">
                  <button
                    onClick={() => setSelectedClass('')}
                    className="group flex items-center gap-2 text-xs font-black uppercase tracking-widest text-accent hover:text-foreground transition-all"
                  >
                    <ChevronLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                    Change Class ({selectedClass})
                  </button>
                  <div className="h-4 w-px bg-border hidden sm:block" />
                  <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest hidden sm:block">
                    Filtered <span className="text-foreground">{filteredUniforms.length}</span> Official Items
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setFiltersOpen(true)}
                    className="lg:hidden flex items-center gap-2 px-5 py-2.5 bg-secondary/50 rounded-xl text-[10px] font-black uppercase tracking-widest border border-border/50"
                  >
                    <SlidersHorizontal className="w-4 h-4" /> Filters
                  </button>

                  <div className="hidden md:flex items-center bg-secondary/30 p-1 rounded-xl border border-border/50">
                    <button
                      onClick={() => setGridCols(3)}
                      className={`p-2 rounded-lg transition-all ${gridCols === 3 ? 'bg-white shadow-soft text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                    >
                      <Grid2X2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setGridCols(4)}
                      className={`p-2 rounded-lg transition-all ${gridCols === 4 ? 'bg-white shadow-soft text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                    >
                      <Grid3X3 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>

              {filteredUniforms.length === 0 ? (
                <div className="text-center py-32 bg-secondary/20 rounded-3xl border-2 border-dashed border-border/50 animate-fade-in">
                  <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-6 shadow-soft">
                    <ShoppingBag className="w-8 h-8 text-muted-foreground/30" />
                  </div>
                  <h3 className="text-xl font-bold mb-2">No uniforms matching these criteria</h3>
                  <p className="text-muted-foreground text-sm mb-8">Try adjusting your filters or search for another item.</p>
                  <button
                    onClick={clearFilters}
                    className="px-8 py-3 bg-foreground text-background rounded-full text-xs font-black uppercase tracking-widest hover:bg-neutral-800 transition-all active:scale-95"
                  >
                    Reset all filters
                  </button>
                </div>
              ) : (
                <div className={`grid grid-cols-2 text-left md:grid-cols-${gridCols} gap-6 md:gap-8 animate-fade-in`}>
                  {filteredUniforms.map((uniform, idx) => (
                    <ProductCard
                      key={uniform.id}
                      uniform={uniform}
                      school={school!}
                      index={idx}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {school && (
        <SchoolVerificationDialog
          open={!isVerified}
          schoolName={school.name}
          onVerify={async (code) => {
            if (code === school.school_code) {
              sessionStorage.setItem('verified_school', school.id);
              setIsVerified(true);
              return true;
            }
            return false;
          }}
        />
      )}

      <AuthModal
        open={authModalOpen}
        onOpenChange={setAuthModalOpen}
        reason="to view your order history and get faster checkout"
      />
    </Layout>
  );
}
