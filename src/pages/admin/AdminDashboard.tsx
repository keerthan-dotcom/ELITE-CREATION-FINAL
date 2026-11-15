import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

const supabaseAdmin = supabase;

interface School {
  id: string;
  name: string;
  area: string;
}

interface Order {
  id: string;
  order_code: string;
  student_name: string;
  grade: string;
  phone: string;
  total_amount: number;
  payment_method: string;
  status: string;
  created_at: string;
  school_id: string;
  school_name?: string;
  order_items?: Array<{
    item_name: string;
    size: string;
    color?: string | null;
    quantity: number;
    price: number;
  }>;
}

interface Uniform {
  id: string;
  item_name: string;
  grade: string;
  type: string;
  category: string;
  sizes: Array<{
    size: string;
    stock: number;
  }>;
}

import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";

export default function AdminDashboard() {
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const [schools, setSchools] = useState<School[]>([]);
  const [selectedSchool, setSelectedSchool] = useState<School | null>(null);
  const [schoolOrders, setSchoolOrders] = useState<Order[]>([]);
  const [schoolUniforms, setSchoolUniforms] = useState<Uniform[]>([]);
  const [loading, setLoading] = useState(true);
  const [schoolLoading, setSchoolLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [allOrders, setAllOrders] = useState<Order[]>([]);
  const [totalAllRevenue, setTotalAllRevenue] = useState(0);
  const [totalAllOrders, setTotalAllOrders] = useState(0);

  async function fetchSchools() {
    const { data, error } = await supabase
      .from("schools")
      .select("*")
      .order("name");

    if (error) {
      console.error("Fetch schools error:", error);
      return;
    }
    setSchools(data || []);
  }

  async function fetchAllOrders() {
    const { data, error } = await supabase
      .from("orders")
      .select("*, schools(name), order_items(*)")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Fetch all orders error:", error);
      return;
    }

    const ordersWithDetails = data?.map(order => ({
      ...order,
      grade: order.grade,
      school_name: order.schools?.name || 'Unknown',
      order_items: order.order_items || []
    })) || [];

    setAllOrders(ordersWithDetails);
    const revenue = ordersWithDetails.reduce((sum, order) => sum + (order.total_amount || 0), 0);
    setTotalAllRevenue(revenue);
    setTotalAllOrders(ordersWithDetails.length);
  }

  async function fetchSchoolData(schoolId: string) {
    setSchoolLoading(true);

    // Fetch orders for the school
    const { data: ordersData, error: ordersError } = await supabaseAdmin
      .from("orders")
      .select("id,order_code,student_name,grade,phone,total_amount,payment_method,status,created_at,school_id,order_items(size,color,quantity,price,item_name)")
      .eq("school_id", schoolId)
      .order("created_at", { ascending: false });

    if (ordersError) {
      console.error("Fetch school orders error:", ordersError);
    } else {
      const flattenedOrders = ordersData?.map(order => ({
        ...order,
        order_items: order.order_items || []
      })) || [];
      setSchoolOrders(flattenedOrders);
    }

    // Fetch uniforms for the school
    // Try uniforms table first, fallback to products if needed
    let uniformsData: any[] = [];
    let uniformsError: any = null;

    const { data: uniforms, error: uniformsErr } = await supabaseAdmin
      .from("uniforms")
      .select("id,item_name,type,category,price,image_url,grade")
      .eq("school_id", schoolId);

    if (uniformsErr) {
      console.log('Uniforms table not found, trying products table...');
      const { data: products, error: productsErr } = await supabaseAdmin
        .from("products")
        .select("id,name,gender,category")
        .eq("school_id", schoolId);

      if (productsErr) {
        console.error("Fetch school uniforms error:", productsErr);
        uniformsError = productsErr;
      } else if (products) {
        uniformsData = products.map(p => ({
          id: p.id,
          item_name: p.name,
          type: p.gender,
          category: p.category,
          sizes: []
        }));
      }
    } else if (uniforms) {
      uniformsData = uniforms.map(u => ({
        ...u,
        sizes: [] // Sizes can be fetched separately if needed
      }));
    }

    if (!uniformsError) {
      setSchoolUniforms(uniformsData);
    }

    setSchoolLoading(false);
  }

  useEffect(() => {
    const loadData = async () => {
      await fetchSchools();
      await fetchAllOrders();
      setLoading(false);
    };
    loadData();
  }, []);

  useEffect(() => {
    if (selectedSchool) {
      fetchSchoolData(selectedSchool.id);
    }
  }, [selectedSchool]);

  // Computed variables - define dependencies first
  const totalOrders = schoolOrders.length;
  const totalRevenue = schoolOrders.reduce(
    (sum, o) => sum + Number(o.total_amount || 0),
    0
  );
  const confirmedOrders = schoolOrders.filter(o =>
    o.status?.toUpperCase() === "CONFIRMED" ||
    o.status?.toLowerCase() === "confirmed" ||
    o.status?.toUpperCase() === "DELIVERED" ||
    o.status?.toLowerCase() === "delivered"
  );
  const pendingStock = schoolUniforms.filter(uniform =>
    uniform.sizes.some(size => size.stock <= 0)
  );

  const filteredOrders = confirmedOrders.filter(order =>
    order.student_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    order.order_code.toLowerCase().includes(searchQuery.toLowerCase()) ||
    order.grade.toLowerCase().includes(searchQuery.toLowerCase())
  );

  function updateOrderStatus(orderId: string, newStatus: string) {
    supabaseAdmin
      .from("orders")
      .update({ status: newStatus })
      .eq("id", orderId)
      .then(({ error }) => {
        if (error) {
          console.error("Update status error:", error);
          alert("Failed to update status");
        } else {
          // Refresh data
          if (selectedSchool) {
            fetchSchoolData(selectedSchool.id);
          }
          fetchAllOrders();
        }
      });
  }

  function deleteOrder(orderId: string) {
    if (!confirm("Are you sure you want to delete this order? This will also delete all associated order items and receipts. This action cannot be undone.")) return;
    
    supabaseAdmin
      .from("orders")
      .delete()
      .eq("id", orderId)
      .then(({ error }) => {
        if (error) {
          console.error("Delete order error:", error);
          alert("Failed to delete order");
        } else {
          alert("Order deleted successfully");
          if (selectedSchool) {
            fetchSchoolData(selectedSchool.id);
          }
          fetchAllOrders();
        }
      });
  }

  function deleteAllOrders() {
    const confirmation = prompt("WARNING: This will permanently delete ALL orders across all schools, including all order items and receipts. This action is irreversible.\n\nType 'delete all' to confirm:");
    if (confirmation !== "delete all") {
      alert("Delete cancelled. Confirmation text did not match.");
      return;
    }
    
    supabaseAdmin
      .from("orders")
      .delete()
      .neq("id", "00000000-0000-0000-0000-000000000000") // Deletes all orders
      .then(({ error }) => {
        if (error) {
          console.error("Delete all orders error:", error);
          alert("Failed to delete all orders");
        } else {
          alert("All orders deleted successfully");
          if (selectedSchool) {
            fetchSchoolData(selectedSchool.id);
          }
          fetchAllOrders();
        }
      });
  }

  function exportToCSV(ordersToExport: Order[] = filteredOrders, filenamePrefix: string = selectedSchool?.name || 'all') {
    const headers = ["Order Code", "Student Name", "Grade", "School", "Items", "Phone", "Payment", "Status", "Total", "Date"];
    const rows = ordersToExport.map(order => {
      const itemsString = order.order_items?.map(item => `${item.item_name}${item.color ? ` (${item.color})` : ''} Size:${item.size} x${item.quantity}`).join("; ") || "";
      return [
        order.order_code,
        order.student_name,
        order.grade,
        order.school_name || '',
        itemsString,
        `="${order.phone}"`, // Force Excel to treat as string
        order.payment_method,
        order.status,
        order.total_amount,
        `="${new Date(order.created_at || new Date()).toISOString().split('T')[0]}"` // Force Excel string format
      ];
    });

    const csvContent = [headers, ...rows].map(row =>
      row.map(cell => {
        const cellStr = String(cell || '');
        // Escape double quotes by replacing " with ""
        return `"${cellStr.replace(/"/g, '""')}"`;
      }).join(",")
    ).join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `orders-${filenamePrefix}-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  }

  return (
    <div className="p-4 max-w-7xl mx-auto">
      {/* ── Top Header ── */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-6">
        <h1 className="text-2xl font-bold">Distributor Dashboard</h1>
        <div className="flex flex-wrap gap-2">
          <a
            href="/admin/schools"
            className="flex-1 sm:flex-none text-center px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 text-sm font-medium"
          >
            Manage Schools
          </a>
          <a
            href="/admin/returned-orders"
            className="flex-1 sm:flex-none text-center px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 text-sm font-medium"
          >
            Returned Orders
          </a>
          <button
            onClick={async () => {
              await signOut();
              navigate('/', { replace: true });
            }}
            className="flex-1 sm:flex-none px-4 py-2 border rounded-md hover:bg-muted text-sm font-medium"
          >
            Logout
          </button>
        </div>
      </div>

      {/* All Orders Summary */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4">All Orders Summary</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div className="p-4 bg-green-100 rounded-lg">
            <h3 className="text-lg font-semibold">Total Orders</h3>
            <p className="text-2xl">{totalAllOrders}</p>
          </div>
          <div className="p-4 bg-blue-100 rounded-lg">
            <h3 className="text-lg font-semibold">Total Revenue</h3>
            <p className="text-2xl">₹{totalAllRevenue}</p>
          </div>
        </div>

        {/* All Orders Table */}
        <div className="bg-white border rounded-lg p-4">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">All Orders</h3>
            <div className="flex gap-2">
              <button
                onClick={() => exportToCSV(allOrders, 'all-orders')}
                className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700 font-medium"
              >
                Export All CSV
              </button>
              <button
                onClick={deleteAllOrders}
                className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700 font-medium"
              >
                Delete All Orders
              </button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2">Order Code</th>
                  <th className="text-left p-2">Student Name</th>
                  <th className="text-left p-2">Grade</th>
                  <th className="text-left p-2">School</th>
                  <th className="text-left p-2">Items</th>
                  <th className="text-left p-2">Phone</th>
                  <th className="text-left p-2">Payment</th>
                  <th className="text-left p-2">Status</th>
                  <th className="text-left p-2">Total</th>
                  <th className="text-left p-2">Date</th>
                  <th className="text-right p-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {allOrders.map((order) => (
                  <tr key={order.id} className="border-b hover:bg-gray-50">
                    <td className="p-2 font-medium">{order.order_code}</td>
                    <td className="p-2">{order.student_name}</td>
                    <td className="p-2">{order.grade}</td>
                    <td className="p-2">{order.school_name}</td>
                    <td className="p-2">
                      <div className="text-xs space-y-1">
                        {order.order_items?.map((item, idx) => (
                          <div key={idx}>
                            <span className="font-medium">{item.item_name}</span>
                            <span className="text-gray-500"> Size:{item.size}</span>
                            {item.color && <span className="text-gray-700 font-medium"> ({item.color})</span>}
                            <span className="text-gray-500"> x{item.quantity}</span>
                          </div>
                        ))}
                      </div>
                    </td>
                    <td className="p-2">{order.phone}</td>
                    <td className="p-2">{order.payment_method}</td>
                    <td className="p-2">
                      <span className={`px-2 py-1 rounded-full text-xs ${order.status === 'CONFIRMED' ? 'bg-green-100 text-green-800' :
                        order.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' :
                          order.status === 'DELIVERED' ? 'bg-blue-100 text-blue-800' :
                            'bg-gray-100 text-gray-800'
                        }`}>
                        {order.status}
                      </span>
                    </td>
                    <td className="p-2 font-medium">₹{order.total_amount}</td>
                    <td className="p-2">{new Date(order.created_at).toLocaleDateString()}</td>
                    <td className="p-2 text-right">
                      <button
                        onClick={() => deleteOrder(order.id)}
                        className="px-2 py-1 text-xs bg-red-100 hover:bg-red-200 text-red-700 rounded transition-colors font-semibold"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Schools List */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Select School</h2>
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="h-24 bg-gray-200 rounded-lg"></div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {schools.map((school) => (
              <button
                key={school.id}
                onClick={() => setSelectedSchool(school)}
                className={`p-4 border rounded-lg text-left transition-colors ${selectedSchool?.id === school.id
                  ? "border-blue-500 bg-blue-50"
                  : "border-gray-200 hover:border-gray-300"
                  }`}
              >
                <h3 className="font-semibold text-lg">{school.name}</h3>
                <p className="text-gray-600">{school.area}</p>
              </button>
            ))}
          </div>
        )}
      </div>

      {selectedSchool && (
        <>
          {/* School Stats */}
          <div className="mb-8">
            <h2 className="text-xl font-semibold mb-4">{selectedSchool.name} - Overview</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white border rounded-lg p-4">
                <div className="text-2xl font-bold text-blue-600">{totalOrders}</div>
                <div className="text-sm text-gray-600">Total Orders</div>
              </div>
              <div className="bg-white border rounded-lg p-4">
                <div className="text-2xl font-bold text-green-600">₹{totalRevenue}</div>
                <div className="text-sm text-gray-600">Total Revenue</div>
              </div>
              <div className="bg-white border rounded-lg p-4">
                <div className="text-2xl font-bold text-orange-600">{confirmedOrders.length}</div>
                <div className="text-sm text-gray-600">Confirmed Orders</div>
              </div>
            </div>
          </div>

          {/* Pending Stock */}
          <div className="mb-8">
            <h2 className="text-xl font-semibold mb-4">Pending Stock (Out of Stock Items)</h2>
            {schoolLoading ? (
              <div>Loading...</div>
            ) : pendingStock.length === 0 ? (
              <div className="text-gray-600">All items are in stock</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {pendingStock.map((uniform) => (
                  <div key={uniform.id} className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <h3 className="font-semibold text-red-800">{uniform.item_name}</h3>
                    <p className="text-sm text-red-600">Grade: {uniform.grade} | Type: {uniform.type} | Category: {uniform.category}</p>
                    <div className="mt-2">
                      <strong className="text-red-700">Out of Stock Sizes:</strong>
                      <ul className="list-disc list-inside mt-1">
                        {uniform.sizes.filter(size => size.stock <= 0).map((size, i) => (
                          <li key={i} className="text-red-600">{size.size} (Stock: {size.stock})</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Confirmed Orders */}
          <div>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Confirmed Orders ({filteredOrders.length})</h2>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Search orders..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="px-3 py-2 border rounded-lg text-sm"
                />
                <button
                  onClick={() => exportToCSV(filteredOrders, selectedSchool?.name)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700"
                >
                  Export CSV
                </button>
              </div>
            </div>
            {schoolLoading ? (
              <div>Loading...</div>
            ) : confirmedOrders.length === 0 ? (
              <div className="text-gray-600">No confirmed orders for this school</div>
            ) : (
              <div className="space-y-4">
                {filteredOrders.map((order) => (
                  <div key={order.id} className="bg-white border rounded-lg p-6 shadow-sm">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">{order.student_name}</h3>
                        <p className="text-sm text-gray-600">Order #{order.order_code}</p>
                      </div>
                      <div className="flex items-start gap-4">
                        <div className="text-right">
                          <div className="text-lg font-bold text-green-600">₹{order.total_amount}</div>
                          <div className="text-sm text-gray-500">{new Date(order.created_at).toLocaleDateString()}</div>
                        </div>
                        <button
                          onClick={() => deleteOrder(order.id)}
                          className="px-3 py-1.5 text-xs bg-red-50 hover:bg-red-100 text-red-600 rounded-md border border-red-200 transition-colors font-bold ml-2"
                        >
                          Delete Order
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      <div>
                        <p className="text-sm"><strong>Grade:</strong> {order.grade}</p>
                        <p className="text-sm"><strong>Phone:</strong> {order.phone}</p>
                      </div>
                      <div>
                        <p className="text-sm"><strong>Payment:</strong> {order.payment_method}</p>
                        <div className="text-sm">
                          <strong>Status:</strong>
                          <select
                            value={order.status}
                            onChange={(e) => updateOrderStatus(order.id, e.target.value)}
                            className="ml-2 px-2 py-1 border rounded text-xs"
                          >
                            <option value="CONFIRMED">Confirmed</option>
                            <option value="DELIVERED">Delivered</option>
                          </select>
                        </div>
                      </div>
                    </div>

                    <div>
                      <h4 className="font-semibold text-gray-900 mb-2">Order Items</h4>
                      <div className="space-y-2">
                        {order.order_items?.map((item, i) => (
                          <div key={i} className="flex justify-between items-center bg-gray-50 p-3 rounded">
                            <div>
                              <span className="font-medium">{item.item_name}</span>
                              <span className="text-sm text-gray-600 ml-2">Size: {item.size}</span>
                              {item.color && (
                                <span className="text-sm font-semibold text-gray-800 ml-1">({item.color})</span>
                              )}
                            </div>
                            <div className="text-right">
                              <span className="text-sm">Qty: {item.quantity}</span>
                              <span className="ml-4 font-medium">₹{item.price * item.quantity}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
