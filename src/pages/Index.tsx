import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom'; // Added navigate
import { Layout } from '@/components/layout/Layout';
import { SchoolCard } from '@/components/schools/SchoolCard';
import { SchoolVerificationDialog } from '@/components/schools/SchoolVerificationDialog'; // Added import
import { School } from '@/types';
import { supabase } from '@/lib/supabase';
import { Search, MapPin } from 'lucide-react';
import { logError } from '@/lib/errorHandler';

const Index = () => {
  const navigate = useNavigate(); // Added hook
  const [schools, setSchools] = useState<School[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSchool, setSelectedSchool] = useState<School | null>(null); // Added state

  useEffect(() => {
    async function fetchSchools() {
      const { data, error } = await supabase
        .from('schools')
        .select('*')
        .order('name');

      if (error) {
        logError('FetchSchools', error);
      } else {
        setSchools(data || []);
      }
      setLoading(false);
    }

    fetchSchools();
  }, []);

  const filteredSchools = schools.filter(school =>
    school.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    school.area.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <>
      <Layout>
        {/* Hero Section */}
        <section className="relative overflow-hidden border-b border-border mesh-gradient">
          <div className="container mx-auto px-4 py-20 md:py-32 relative z-10">
            <div className="max-w-3xl mx-auto text-center fade-in-up">
              <div className="inline-flex items-center px-3 py-1 text-xs font-medium uppercase tracking-wider border border-accent/20 bg-accent/5 text-accent rounded-full mb-6">
                Premium School Uniforms
              </div>
              <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight mb-8 text-balance">
                Elite Creations
                <br />
                <span className="text-muted-foreground">Made Simple</span>
              </h1>
              <p className="text-xl text-muted-foreground mb-12 max-w-2xl mx-auto leading-relaxed">
                Experience the finest quality uniforms for Bangalore's top educational institutions.
                Seamless ordering, premium fabrics, and perfect fit.
              </p>

              {/* Search */}
              <div className="relative max-w-lg mx-auto group">
                <div className="absolute inset-0 bg-accent/20 blur-2xl group-focus-within:bg-accent/30 transition-all rounded-sm -z-10 opacity-0 group-focus-within:opacity-100" />
                <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground group-focus-within:text-foreground transition-colors" />
                <input
                  type="text"
                  placeholder="Search your school or area..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-14 pr-6 py-5 bg-background border border-border rounded-sm text-lg shadow-soft group-focus-within:shadow-medium group-focus-within:border-foreground transition-all duration-300 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Decorative elements */}
          <div className="absolute top-1/4 -right-20 w-80 h-80 bg-accent/5 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-1/4 -left-20 w-80 h-80 bg-foreground/5 rounded-full blur-3xl" />
        </section>

        {/* Schools Grid */}
        <section className="py-12 md:py-16">
          <div className="container mx-auto px-4">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-2">
                <MapPin className="w-5 h-5 text-muted-foreground" />
                <h2 className="text-lg font-semibold">
                  {filteredSchools.length} Schools in Bangalore
                </h2>
              </div>
            </div>

            {loading ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6">
                {[...Array(10)].map((_, i) => (
                  <div key={i} className="animate-pulse">
                    <div className="aspect-[4/3] bg-secondary rounded-sm" />
                    <div className="p-4 space-y-2">
                      <div className="h-4 bg-secondary rounded w-3/4" />
                      <div className="h-3 bg-secondary rounded w-1/2" />
                    </div>
                  </div>
                ))}
              </div>
            ) : filteredSchools.length === 0 ? (
              <div className="text-center py-16">
                <p className="text-muted-foreground">No schools found matching "{searchQuery}"</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6">
                {filteredSchools.map((school, index) => (
                  <SchoolCard
                    key={school.id}
                    school={school}
                    index={index}
                    onClick={(s) => setSelectedSchool(s)}
                  />
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Trust Indicators */}
        <section className="border-t border-border py-12">
          <div className="container mx-auto px-4">
            <div className="grid grid-cols-3 gap-8 text-center">
              <div>
                <p className="text-2xl md:text-3xl font-bold">15+</p>
                <p className="text-sm text-muted-foreground mt-1">Partner Schools</p>
              </div>
              <div>
                <p className="text-2xl md:text-3xl font-bold">10K+</p>
                <p className="text-sm text-muted-foreground mt-1">Happy Students</p>
              </div>
              <div>
                <p className="text-2xl md:text-3xl font-bold">100%</p>
                <p className="text-sm text-muted-foreground mt-1">Quality Assured</p>
              </div>
            </div>
          </div>
        </section>
      </Layout>

      <SchoolVerificationDialog
        open={!!selectedSchool}
        onClose={() => setSelectedSchool(null)}
        schoolName={selectedSchool?.name || ''}
        onVerify={async (code) => {
          if (!selectedSchool) return false;
          // Simple client-side check since we loaded the code
          // In a real app, this should be a server verification to avoid exposing codes
          // But for now we work with what we have loaded
          if (code === selectedSchool.school_code) {
            sessionStorage.setItem('verified_school', selectedSchool.id);
            navigate(`/school/${selectedSchool.id}`);
            return true;
          }
          return false;
        }}
      />
    </>
  );
};

export default Index;
