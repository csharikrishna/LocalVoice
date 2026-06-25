import { Complaint, AdminRole } from "../../types";
import { StaffManagementTab } from "./StaffManagementTab";
import { AnalyticsTab } from "./AnalyticsTab";
import { SLA_WARNING_HOURS, SLA_BREACH_HOURS } from "@/config/features";
import { Suspense, lazy, useState, useEffect, useRef, useCallback, useMemo } from "react";
import { ClientOnly } from "@/components/ClientOnly";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signOut,
  User,
  isSignInWithEmailLink,
  signInWithEmailLink,
  sendSignInLinkToEmail,
} from "firebase/auth";
import { db, auth } from "@/lib/firebase";
import { useGeolocation } from "@/hooks/useGeolocation";
import {
  Loader2,
  MapPin,
  Lock,
  LogOut,
  Download,
  ArrowUpDown,
  Search,
  Filter,
  X,
  AlertCircle,
  Wrench,
  CheckCircle2,
  BarChart3,
  RefreshCw,
  ChevronDown,
  Check,
  Navigation,
  Trash2,
  Edit3,
  Save,
  Flame,
  CheckSquare,
} from "lucide-react";
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  getPaginationRowModel,
  RowSelectionState,
  SortingState,
  useReactTable,
} from "@tanstack/react-table";

import { toast } from "sonner";
import { updateComplaint, deleteComplaints } from "@/lib/api/admin.functions";
import { getAdminComplaints } from "@/lib/api/queries.functions";

const AdminMap = lazy(() => import("./AdminMap"));



// ============================================================
// Inline Status/Department Select (uncontrolled to avoid re-render issues)
// ============================================================

function StatusSelect({
  id,
  currentValue,
  onChange,
}: {
  id: string;
  currentValue: string;
  onChange: (id: string, val: string) => void;
}) {
  const selectRef = useRef<HTMLSelectElement>(null);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      e.stopPropagation();
      onChange(id, e.target.value);
    },
    [id, onChange],
  );

  const val = currentValue || "open";
  const color = val === "open" ? "#dc2626" : val === "working" ? "#d97706" : "#16a34a";
  const bg = val === "open" ? "#fef2f2" : val === "working" ? "#fffbeb" : "#f0fdf4";

  return (
    <select
      ref={selectRef}
      defaultValue={val}
      key={`${id}-${val}`}
      onChange={handleChange}
      onClick={(e) => e.stopPropagation()}
      className="text-xs font-bold border border-gray-200 rounded-md px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500/50 cursor-pointer transition-all shadow-sm appearance-none pr-8"
      style={{
        color,
        backgroundColor: bg,
        backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
        backgroundPosition: "right 0.25rem center",
        backgroundRepeat: "no-repeat",
        backgroundSize: "1.25em 1.25em",
      }}
    >
      <option value="open">Open</option>
      <option value="working">In Progress</option>
      <option value="closed">Closed</option>
    </select>
  );
}

function DepartmentSelect({
  id,
  currentValue,
  onChange,
}: {
  id: string;
  currentValue: string;
  onChange: (id: string, val: string) => void;
}) {
  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      e.stopPropagation();
      onChange(id, e.target.value);
    },
    [id, onChange],
  );

  const val = currentValue || "";

  return (
    <select
      defaultValue={val}
      key={`${id}-${val}`}
      onChange={handleChange}
      onClick={(e) => e.stopPropagation()}
      className="text-xs font-semibold text-gray-700 border border-gray-200 rounded-md px-2.5 py-1.5 bg-gray-50 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500/50 cursor-pointer transition-all shadow-sm appearance-none pr-8"
      style={{
        backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
        backgroundPosition: "right 0.25rem center",
        backgroundRepeat: "no-repeat",
        backgroundSize: "1.25em 1.25em",
      }}
    >
      <option value="">Unassigned</option>
      <option value="Sanitation">Sanitation</option>
      <option value="Electrical">Electrical</option>
      <option value="Water Board">Water Board</option>
      <option value="Public Works">Public Works</option>
      <option value="Parks & Rec">Parks &amp; Rec</option>
    </select>
  );
}

// ============================================================
// Custom Filter Dropdown
// ============================================================

function FilterDropdown({
  value,
  onChange,
  options,
  label,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  label: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectedOption = options.find((o) => o.value === value) || options[0];

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center justify-between min-w-[160px] px-3 py-2 text-sm bg-white border rounded-lg transition-all ${
          isOpen
            ? "border-blue-500 ring-2 ring-blue-500/20"
            : "border-gray-200 hover:border-gray-300"
        }`}
        aria-label={label}
        aria-expanded={isOpen}
      >
        <span className="font-medium text-gray-700">{selectedOption.label}</span>
        <ChevronDown
          size={14}
          className={`text-gray-400 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
        />
      </button>

      {isOpen && (
        <div className="absolute z-50 w-full min-w-[160px] mt-1 bg-white border border-gray-100 rounded-lg shadow-xl shadow-blue-900/5 py-1 animate-in fade-in slide-in-from-top-2 duration-200">
          {options.map((option) => {
            const isSelected = option.value === value;
            return (
              <button
                key={option.value}
                type="button"
                className={`w-full flex items-center justify-between px-3 py-2 text-sm transition-colors ${
                  isSelected
                    ? "bg-blue-50 text-blue-700 font-medium"
                    : "text-gray-700 hover:bg-gray-50"
                }`}
                onClick={() => {
                  onChange(option.value);
                  setIsOpen(false);
                }}
              >
                <span>{option.label}</span>
                {isSelected && <Check size={14} className="text-blue-600" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ============================================================
// Admin Dashboard
// ============================================================

const columnHelper = createColumnHelper<Complaint>();

export function AdminDashboard({
  role,
  department,
  squadId,
}: {
  role: AdminRole;
  department?: string | null;
  squadId?: string | null;
}) {
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [focusedLocation, setFocusedLocation] = useState<[number, number] | null>(null);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  const [showHeatmap, setShowHeatmap] = useState(false);
  const [activeTab, setActiveTab] = useState<"tickets" | "staff" | "analytics">("tickets");
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const [slaEnabled, setSlaEnabled] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("slaEnabled") === "true";
    }
    return false;
  });

  useEffect(() => {
    localStorage.setItem("slaEnabled", String(slaEnabled));
  }, [slaEnabled]);

  const [adminLocation, setAdminLocation] = useState<[number, number] | null>(null);
  const { detectLocation, isDetecting } = useGeolocation({
    onSuccess: (coords) => {
      setAdminLocation([coords.lat, coords.lng]);
      setFocusedLocation([coords.lat, coords.lng]);
    },
    onError: (msg) => toast.error(msg),
  });

  // Super Admin states
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingDescription, setEditingDescription] = useState<string>("");
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);

  const toggleSelectMode = useCallback(() => {
    setIsSelectMode((prev) => {
      if (prev) setRowSelection({}); // clear selection when turning off
      return !prev;
    });
  }, []);

  const handleBulkDelete = useCallback(async () => {
    const selectedIds = Object.keys(rowSelection).filter((id) => rowSelection[id]);
    if (selectedIds.length === 0) return;
    if (!window.confirm(`Are you sure you want to delete ${selectedIds.length} selected issues?`))
      return;

    setIsBulkDeleting(true);
    try {
      const token = await auth.currentUser?.getIdToken();
      if (!token) throw new Error("Not authenticated");
      const res = await deleteComplaints({ data: { adminToken: token, complaintIds: selectedIds } });
      if (!res.ok) throw new Error(res.message);
      
      setComplaints((prev) => prev.filter((c) => !selectedIds.includes(c.id)));
      setRowSelection({});
      toast.success(`Deleted ${selectedIds.length} issues successfully.`);
    } catch (err) {
      console.error("Bulk delete failed", err);
      const message = err instanceof Error ? err.message : "Unknown error";
      toast.error("Failed to delete selected issues: " + message);
    } finally {
      setIsBulkDeleting(false);
    }
  }, [rowSelection]);

  // ── Fetch data (no real-time listener to avoid re-render storms) ──
  const fetchComplaints = useCallback(async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true);
    try {
      const token = await auth.currentUser?.getIdToken();
      if (!token) return;
      const data = await getAdminComplaints({ data: { adminToken: token } });
      setComplaints(data as any);
    } catch (error) {
      console.error("Error fetching complaints:", error);
      toast.error("Failed to load complaints");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchComplaints();
  }, [fetchComplaints]);

  // ── Debounced search ──
  const handleSearchChange = useCallback((value: string) => {
    setSearchInput(value);
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => {
      setGlobalFilter(value);
    }, 300);
  }, []);

  useEffect(() => {
    return () => {
      if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    };
  }, []);

  // ── Memoised derived data ──
  const domainComplaints = useMemo(() => {
    return complaints.filter((c) => {
      // Domain isolation for department staff
      if (
        (role === "department_admin" || role === "field_worker") &&
        department &&
        c.department !== department
      )
        return false;
      return true;
    });
  }, [complaints, role, department]);

  const filteredComplaints = useMemo(() => {
    return domainComplaints.filter((c) => {
      if (statusFilter !== "all" && c.status !== statusFilter) return false;
      if (categoryFilter !== "all" && c.category !== categoryFilter) return false;
      if (globalFilter) {
        const search = globalFilter.toLowerCase();
        return (
          (c.token || "").toLowerCase().includes(search) ||
          c.description.toLowerCase().includes(search) ||
          c.location.toLowerCase().includes(search) ||
          c.category.toLowerCase().includes(search)
        );
      }
      return true;
    });
  }, [domainComplaints, statusFilter, categoryFilter, globalFilter]);

  const stats = useMemo(
    () => ({
      total: domainComplaints.length,
      open: domainComplaints.filter((c) => c.status === "open").length,
      working: domainComplaints.filter((c) => c.status === "working").length,
      closed: domainComplaints.filter((c) => c.status === "closed").length,
    }),
    [domainComplaints],
  );

  const uniqueCategories = useMemo(
    () => [...new Set(domainComplaints.map((c) => c.category))].sort(),
    [domainComplaints],
  );

  // ── Handlers (update local state immediately, then Firestore) ──
  const handleStatusChange = useCallback(
    async (id: string, newStatus: string) => {
      // Optimistic local update
      setComplaints((prev) => prev.map((c) => (c.id === id ? { ...c, status: newStatus } : c)));
      try {
        const token = await auth.currentUser?.getIdToken();
        if (!token) throw new Error("Not authenticated");
        const res = await updateComplaint({ data: { adminToken: token, complaintId: id, updates: { status: newStatus } } });
        if (!res.ok) throw new Error(res.message);
        toast.success(
          `Status updated to "${newStatus === "open" ? "Open" : newStatus === "working" ? "In Progress" : "Closed"}"`,
        );
      } catch (err) {
        console.error("Failed to update status", err);
        toast.error("Failed to update status. Please try again.");
        // Revert on failure
        fetchComplaints();
      }
    },
    [fetchComplaints],
  );

  const handleDepartmentChange = useCallback(
    async (id: string, newDepartment: string) => {
      setComplaints((prev) =>
        prev.map((c) => (c.id === id ? { ...c, department: newDepartment } : c)),
      );
      try {
        const token = await auth.currentUser?.getIdToken();
        if (!token) throw new Error("Not authenticated");
        const res = await updateComplaint({ data: { adminToken: token, complaintId: id, updates: { department: newDepartment } } });
        if (!res.ok) throw new Error(res.message);
        toast.success(`Department updated to "${newDepartment || "Unassigned"}"`);
      } catch (err) {
        console.error("Failed to update department", err);
        toast.error("Failed to update department. Please try again.");
        fetchComplaints();
      }
    },
    [fetchComplaints],
  );

  // ── Super Admin Actions ──
  const handleEditDescription = useCallback(async (id: string, newDesc: string) => {
    try {
      const token = await auth.currentUser?.getIdToken();
      if (!token) throw new Error("Not authenticated");
      const res = await updateComplaint({ data: { adminToken: token, complaintId: id, updates: { description: newDesc } } });
      if (!res.ok) throw new Error(res.message);
      
      setComplaints((prev) => prev.map((c) => (c.id === id ? { ...c, description: newDesc } : c)));
      toast.success("Description updated");
      setEditingId(null);
    } catch (err) {
      console.error("Failed to update description", err);
      toast.error("Failed to update description");
    }
  }, []);

  const handleDelete = useCallback(async (id: string) => {
    if (!window.confirm("Are you sure you want to permanently delete this issue?")) return;
    try {
      const token = await auth.currentUser?.getIdToken();
      if (!token) throw new Error("Not authenticated");
      const res = await deleteComplaints({ data: { adminToken: token, complaintIds: [id] } });
      if (!res.ok) throw new Error(res.message);
      
      setComplaints((prev) => prev.filter((c) => c.id !== id));
      toast.success("Issue deleted");
    } catch (err) {
      console.error("Failed to delete issue", err);
      toast.error("Failed to delete issue");
    }
  }, []);

  const handleExport = useCallback(async () => {
    try {
      const ExcelJS = (await import("exceljs")).default;
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet("Complaints");

      worksheet.columns = [
        { header: "Token", key: "token", width: 15 },
        { header: "Category", key: "category", width: 20 },
        { header: "Department", key: "department", width: 20 },
        { header: "Status", key: "status", width: 15 },
        { header: "Location", key: "location", width: 40 },
        { header: "Map Link", key: "map_link", width: 20 },
        { header: "Description", key: "description", width: 50 },
        { header: "Date", key: "date", width: 25 },
        { header: "Upvotes", key: "upvotes", width: 15 },
        { header: "Photo", key: "photo", width: 30 },
      ];

      // Bold headers and light gray background
      worksheet.getRow(1).font = { bold: true };
      worksheet.getRow(1).fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFF3F4F6" },
      };

      filteredComplaints.forEach((c) => {
        const row = worksheet.addRow({
          token: c.token || "N/A",
          category: c.category,
          department: c.department || "Unassigned",
          status: c.status.toUpperCase(),
          location: c.location,
          map_link: c.coordinates
            ? {
                text: "Get Directions",
                hyperlink: `https://www.google.com/maps/dir/?api=1&destination=${c.coordinates.lat},${c.coordinates.lng}`,
              }
            : "N/A",
          description: c.description,
          date: c.timestamp ? new Date(typeof c.timestamp === 'string' ? c.timestamp : c.timestamp.toDate?.() || c.timestamp).toLocaleString() : "",
          upvotes: c.upvotes || 0,
          photo: c.photoURL
            ? { formula: `IMAGE("${c.photoURL}")`, result: "Photo Link" }
            : "No Photo",
        });

        // Color code status column
        const statusCell = row.getCell("status");
        if (c.status === "open") {
          statusCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFEE2E2" } }; // red-100
          statusCell.font = { color: { argb: "FF991B1B" }, bold: true }; // red-800
        } else if (c.status === "working") {
          statusCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFEF3C7" } }; // amber-100
          statusCell.font = { color: { argb: "FF92400E" }, bold: true }; // amber-800
        } else if (c.status === "closed") {
          statusCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFDCFCE7" } }; // green-100
          statusCell.font = { color: { argb: "FF166534" }, bold: true }; // green-800
        }
      });

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const appName = (import.meta.env.VITE_APP_NAME || "LocalVoice")
        .toLowerCase()
        .replace(/\s+/g, "_");
      a.download = `${appName}_complaints_${new Date().toISOString().split("T")[0]}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Export failed:", err);
      toast.error("Failed to export Excel file.");
    }
  }, [filteredComplaints]);

  const handleImageClick = useCallback((url: string) => {
    setLightboxImage(url);
  }, []);

  // ── Table columns ──
  const columns = useMemo(
    () => [
      ...(role === "superadmin" && isSelectMode
        ? [
            columnHelper.display({
              id: "select",
              header: ({ table }) => (
                <input
                  type="checkbox"
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
                  checked={table.getIsAllRowsSelected()}
                  ref={(input) => {
                    if (input) {
                      input.indeterminate = table.getIsSomeRowsSelected();
                    }
                  }}
                  onChange={table.getToggleAllRowsSelectedHandler()}
                />
              ),
              cell: ({ row }) => (
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
                    checked={row.getIsSelected()}
                    disabled={!row.getCanSelect()}
                    onChange={row.getToggleSelectedHandler()}
                    onClick={(e) => e.stopPropagation()}
                  />
                </div>
              ),
            }),
          ]
        : []),
      columnHelper.accessor("token", {
        header: "Token",
        cell: (info) => (
          <span className="font-mono text-xs bg-gray-100 px-2 py-1 rounded">
            {info.getValue() || "N/A"}
          </span>
        ),
      }),
      columnHelper.accessor("photoURL", {
        header: "Photo",
        enableSorting: false,
        cell: (info) => {
          const url = info.getValue();
          if (!url) return <span className="text-gray-400 text-xs italic">None</span>;
          return (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleImageClick(url);
              }}
              className="block w-10 h-10 rounded overflow-hidden border border-gray-200 cursor-pointer"
            >
              <img
                src={url}
                alt="Complaint"
                className="w-full h-full object-cover hover:scale-110 transition-transform"
                loading="lazy"
              />
            </button>
          );
        },
      }),
      columnHelper.accessor("category", {
        header: "Category",
        cell: (info) => (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
            {info.getValue()}
          </span>
        ),
      }),
      columnHelper.accessor("status", {
        header: "Status",
        cell: (info) => (
          <StatusSelect
            id={info.row.original.id}
            currentValue={info.getValue()}
            onChange={handleStatusChange}
          />
        ),
      }),
      columnHelper.accessor("department", {
        header: "Department",
        cell: (info) => (
          <DepartmentSelect
            id={info.row.original.id}
            currentValue={info.getValue() || ""}
            onChange={handleDepartmentChange}
          />
        ),
      }),
      columnHelper.accessor("location", {
        header: "Location",
        cell: (info) => {
          const coords = info.row.original.coordinates;
          const locationText = info.getValue();
          return (
            <div className="flex items-center gap-2 min-w-[200px] group">
              <MapPin size={14} className="text-gray-400 shrink-0" />
              <span className="text-sm truncate max-w-[220px]" title={locationText}>
                {locationText}
              </span>
              {coords && (
                <a
                  href={`https://www.google.com/maps/dir/?api=1&destination=${coords.lat},${coords.lng}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="ml-auto opacity-100 md:opacity-0 group-hover:opacity-100 p-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100 hover:text-blue-700 rounded transition-all flex items-center justify-center shrink-0"
                  title="Get Directions in Google Maps"
                  aria-label="Get Directions"
                >
                  <Navigation size={14} />
                </a>
              )}
            </div>
          );
        },
      }),
      columnHelper.accessor("description", {
        header: "Description",
        cell: (info) => {
          if (editingId === info.row.original.id) {
            return (
              <div
                className="flex items-center gap-2 min-w-[250px]"
                onClick={(e) => e.stopPropagation()}
              >
                <input
                  autoFocus
                  value={editingDescription}
                  onChange={(e) => setEditingDescription(e.target.value)}
                  className="flex-1 text-sm border border-blue-400 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  onClick={() => handleEditDescription(info.row.original.id, editingDescription)}
                  className="p-1 text-green-600 hover:bg-green-50 rounded"
                  title="Save"
                >
                  <Save size={16} />
                </button>
                <button
                  onClick={() => setEditingId(null)}
                  className="p-1 text-gray-500 hover:bg-gray-100 rounded"
                  title="Cancel"
                >
                  <X size={16} />
                </button>
              </div>
            );
          }

          return (
            <div className="text-sm truncate max-w-[250px] group relative flex items-center justify-between">
              <span title={info.getValue()}>{info.getValue()}</span>
              {role === "superadmin" && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setEditingId(info.row.original.id);
                    setEditingDescription(info.getValue());
                  }}
                  className="opacity-0 group-hover:opacity-100 p-1 text-blue-600 hover:bg-blue-50 rounded transition-all shrink-0 ml-2"
                  title="Edit Description"
                >
                  <Edit3 size={14} />
                </button>
              )}
            </div>
          );
        },
      }),
      columnHelper.accessor("timestamp", {
        header: "Date",
        cell: (info) => {
          const ts = info.getValue();
          const dateStr = ts ? new Date(typeof ts === 'string' ? ts : ts.toDate?.() || ts).toLocaleString() : "";
          
          if (!slaEnabled || !ts) {
             return <span className="text-sm text-gray-500 whitespace-nowrap">{dateStr}</span>;
          }

          const createdAt = new Date(typeof ts === 'string' ? ts : ts.toDate?.() || ts);
          const complaint = info.row.original;
          let isBreached = false;
          let isWarning = false;

          if (complaint.status === "closed" && complaint.resolvedAt) {
             const resolvedDate = new Date(complaint.resolvedAt?.toDate?.() || complaint.resolvedAt);
             const diffHours = (resolvedDate.getTime() - createdAt.getTime()) / (1000 * 60 * 60);
             isBreached = diffHours > SLA_BREACH_HOURS;
          } else if (complaint.status !== "closed") {
             const diffHours = (new Date().getTime() - createdAt.getTime()) / (1000 * 60 * 60);
             isBreached = diffHours > SLA_BREACH_HOURS;
             isWarning = diffHours > SLA_WARNING_HOURS && !isBreached;
          }

          return (
            <div className="flex flex-col gap-1">
              <span className="text-sm text-gray-500 whitespace-nowrap">{dateStr}</span>
              {isBreached && <span className="text-[10px] font-bold text-red-600 bg-red-100 px-1.5 py-0.5 rounded w-max tracking-wide">SLA BREACHED</span>}
              {isWarning && <span className="text-[10px] font-bold text-amber-600 bg-amber-100 px-1.5 py-0.5 rounded w-max tracking-wide">SLA WARNING</span>}
            </div>
          );
        },
      }),
      ...(role === "superadmin"
        ? [
            columnHelper.display({
              id: "actions",
              header: "Actions",
              cell: (info) => (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(info.row.original.id);
                  }}
                  className="text-red-500 hover:bg-red-50 p-1.5 rounded transition-colors"
                  title="Delete Issue"
                >
                  <Trash2 size={16} />
                </button>
              ),
            }),
          ]
        : []),
    ],
    [
      handleStatusChange,
      handleDepartmentChange,
      handleImageClick,
      editingId,
      editingDescription,
      role,
      isSelectMode,
      handleEditDescription,
      handleDelete,
      slaEnabled,
    ],
  );

  // ── React Table instance ──
  const table = useReactTable({
    data: filteredComplaints,
    columns,
    state: { sorting, rowSelection },
    enableRowSelection: true,
    onRowSelectionChange: setRowSelection,
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getRowId: (row) => row.id, // CRITICAL: stable row identity
    initialState: {
      pagination: { pageSize: 15 },
    },
  });

  // ── Map complaints (memoized separately) ──
  const mapComplaints = useMemo(
    () => filteredComplaints.filter((c) => c.coordinates),
    [filteredComplaints],
  );

  return (
    <div
      className={
        role === "department_admin"
          ? "px-4 max-w-7xl mx-auto flex flex-col pb-12 w-full mt-6"
          : "min-h-screen pt-20 px-4 max-w-7xl mx-auto flex flex-col pb-12"
      }
    >
      <div className="mb-6 flex justify-between items-end flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight mb-2 text-[color:var(--text-primary)]">
            {role === "department_admin" && department
              ? `${department} Portal`
              : role === "admin"
                ? "City Dispatch Dashboard"
                : "Central Command Dashboard"}
          </h1>
          <p className="text-[color:var(--text-secondary)]">
            {role === "department_admin" && department
              ? `Manage and resolve issues assigned to the ${department} department.`
              : role === "admin"
                ? "Assign incoming reports to departments and monitor resolution progress."
                : "Full system oversight — all departments, all issues, all controls."}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => fetchComplaints(true)}
            disabled={refreshing}
            className="flex items-center gap-2 text-sm text-gray-600 bg-white border border-gray-200 px-4 py-2 rounded-lg transition-colors shadow-sm hover:bg-gray-50 disabled:opacity-50"
          >
            <RefreshCw size={16} className={refreshing ? "animate-spin" : ""} />
            {refreshing ? "Refreshing…" : "Refresh"}
          </button>
          {role === "superadmin" && (
            <button
              onClick={toggleSelectMode}
              className={`flex items-center gap-2 text-sm px-4 py-2 rounded-lg transition-colors shadow-sm font-medium border ${
                isSelectMode
                  ? "bg-blue-50 text-blue-700 border-blue-200"
                  : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
              }`}
            >
              <CheckSquare size={16} className={isSelectMode ? "text-blue-600" : "text-gray-400"} />
              {isSelectMode ? "Selection Active" : "Select Multiple"}
            </button>
          )}
          <button
            onClick={handleExport}
            className="flex items-center gap-2 text-sm text-white bg-green-600 hover:bg-green-700 px-4 py-2 rounded-lg transition-colors shadow-sm font-medium"
          >
            <Download size={16} /> Export to Excel
          </button>
          <button
            onClick={() => signOut(auth)}
            className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 bg-white border border-gray-200 px-4 py-2 rounded-lg transition-colors shadow-sm"
          >
            <LogOut size={16} /> Sign Out
          </button>
        </div>
      </div>

      {role === "superadmin" && (
        <div className="flex items-center gap-4 border-b border-gray-200 mb-6">
          <button
            onClick={() => setActiveTab("tickets")}
            className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === "tickets"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
          >
            Ticket Dispatch
          </button>
          <button
            onClick={() => setActiveTab("staff")}
            className={`pb-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === "staff"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
          >
            Staff Management
          </button>
          <button
            onClick={() => setActiveTab("analytics")}
            className={`pb-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === "analytics"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
          >
            Analytics & SLAs
          </button>
        </div>
      )}

      {activeTab === "staff" ? (
        <StaffManagementTab />
      ) : activeTab === "analytics" ? (
        <AnalyticsTab complaints={complaints} slaEnabled={slaEnabled} setSlaEnabled={setSlaEnabled} />
      ) : (
        <>
          {/* Analytics Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
              <div className="flex items-center gap-2 text-gray-500 text-sm font-medium mb-1">
                <BarChart3 size={16} /> Total Reports
              </div>
              <div className="text-3xl font-bold text-gray-900">{stats.total}</div>
            </div>
            <div className="bg-white rounded-xl p-4 border border-red-100 shadow-sm">
              <div className="flex items-center gap-2 text-red-500 text-sm font-medium mb-1">
                <AlertCircle size={16} /> Open
              </div>
              <div className="text-3xl font-bold text-red-600">{stats.open}</div>
            </div>
            <div className="bg-white rounded-xl p-4 border border-amber-100 shadow-sm">
              <div className="flex items-center gap-2 text-amber-500 text-sm font-medium mb-1">
                <Wrench size={16} /> In Progress
              </div>
              <div className="text-3xl font-bold text-amber-600">{stats.working}</div>
            </div>
            <div className="bg-white rounded-xl p-4 border border-green-100 shadow-sm">
              <div className="flex items-center gap-2 text-green-500 text-sm font-medium mb-1">
                <CheckCircle2 size={16} /> Resolved
              </div>
              <div className="text-3xl font-bold text-green-600">{stats.closed}</div>
            </div>
          </div>

          {/* Filters Bar */}
          <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm mb-6 flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 text-sm font-medium text-gray-500">
              <Filter size={16} /> Filters:
            </div>
            <FilterDropdown
              value={statusFilter}
              onChange={setStatusFilter}
              label="Filter by status"
              options={[
                { value: "all", label: "All Statuses" },
                { value: "open", label: "Open" },
                { value: "working", label: "In Progress" },
                { value: "closed", label: "Resolved" },
              ]}
            />
            <FilterDropdown
              value={categoryFilter}
              onChange={setCategoryFilter}
              label="Filter by category"
              options={[
                { value: "all", label: "All Categories" },
                ...uniqueCategories.map((cat) => ({ value: cat, label: cat })),
              ]}
            />
            <div className="flex-1 min-w-[200px] relative">
              <Search
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              />
              <input
                type="text"
                value={searchInput}
                onChange={(e) => handleSearchChange(e.target.value)}
                placeholder="Search by token, description, or location…"
                className="w-full pl-9 pr-8 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                aria-label="Search complaints"
              />
              {searchInput && (
                <button
                  onClick={() => {
                    setSearchInput("");
                    setGlobalFilter("");
                  }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  aria-label="Clear search"
                >
                  <X size={16} />
                </button>
              )}
            </div>
            <button
              onClick={() => setShowHeatmap(!showHeatmap)}
              className={`px-3 py-2 text-sm font-medium rounded-lg border transition-all flex items-center gap-2 ml-auto ${
                showHeatmap
                  ? "bg-red-50 text-red-600 border-red-200"
                  : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
              }`}
            >
              <Flame size={16} className={showHeatmap ? "text-red-500" : "text-gray-400"} />
              {showHeatmap ? "Hide Heatmap" : "Show Heatmap"}
            </button>
            <div className="text-sm text-gray-500">
              {filteredComplaints.length} of {complaints.length} results
            </div>
          </div>

          <div className="flex flex-col gap-6 flex-1">
            {/* Map View */}
            <div className="w-full bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden relative h-[400px]">
              {loading ? (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-50 z-10">
                  <Loader2 className="animate-spin text-blue-600" size={32} />
                </div>
              ) : (
                <ClientOnly fallback={<div className="w-full h-full flex items-center justify-center"><Loader2 className="animate-spin text-blue-500" size={32} /></div>}>
                  <Suspense fallback={<div className="w-full h-full flex items-center justify-center"><Loader2 className="animate-spin text-blue-500" size={32} /></div>}>
                    <AdminMap
                      complaints={mapComplaints}
                      focusedLocation={focusedLocation}
                      onImageClick={handleImageClick}
                      showHeatmap={showHeatmap}
                      adminLocation={adminLocation}
                      onLocateMe={detectLocation}
                      isLocating={isDetecting}
                    />
                  </Suspense>
                </ClientOnly>
              )}
            </div>

            {/* Data Table */}
            <div className="w-full bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden flex flex-col">
              <div className="px-6 py-4 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
                <div className="flex items-center gap-4">
                  <h2 className="font-semibold text-gray-800">All Complaints Database</h2>
                  {Object.keys(rowSelection).length > 0 && (
                    <div className="flex items-center gap-3 border-l border-gray-300 pl-4 animate-in fade-in slide-in-from-left-2">
                      <span className="text-sm font-medium text-blue-800 bg-blue-100 border border-blue-200 px-2.5 py-1 rounded-md shadow-sm">
                        {Object.keys(rowSelection).length} selected
                      </span>
                      <button
                        onClick={handleBulkDelete}
                        disabled={isBulkDeleting}
                        className="flex items-center gap-1.5 text-sm bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 rounded-lg transition-colors shadow-sm font-medium disabled:opacity-70"
                      >
                        {isBulkDeleting ? (
                          <Loader2 size={14} className="animate-spin" />
                        ) : (
                          <Trash2 size={14} />
                        )}
                        {isBulkDeleting ? "Deleting..." : "Delete Selected"}
                      </button>
                      <button
                        onClick={() => setRowSelection({})}
                        className="text-sm font-medium text-gray-500 hover:text-gray-800 transition-colors ml-1"
                      >
                        Deselect All
                      </button>
                    </div>
                  )}
                </div>
                <span className="text-sm text-gray-500">
                  {filteredComplaints.length} of {complaints.length} Records
                </span>
              </div>

              <div className="overflow-x-auto">
                {loading ? (
                  <div className="p-8 flex justify-center">
                    <Loader2 className="animate-spin text-gray-400" size={24} />
                  </div>
                ) : filteredComplaints.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 mx-auto rounded-full bg-gray-100 flex items-center justify-center mb-3">
                      <Search size={24} className="text-gray-400" />
                    </div>
                    <p className="text-gray-500 font-medium">No complaints match your filters.</p>
                    <p className="text-gray-400 text-sm mt-1">
                      Try adjusting your search or filter criteria.
                    </p>
                  </div>
                ) : (
                  <table className="w-full text-left border-collapse">
                    <thead>
                      {table.getHeaderGroups().map((headerGroup) => (
                        <tr key={headerGroup.id} className="border-b border-gray-200 bg-white">
                          {headerGroup.headers.map((header) => (
                            <th
                              key={header.id}
                              className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-50 transition-colors"
                              onClick={header.column.getToggleSortingHandler()}
                            >
                              <div className="flex items-center gap-2">
                                {flexRender(header.column.columnDef.header, header.getContext())}
                                <ArrowUpDown
                                  size={12}
                                  className={
                                    header.column.getIsSorted() ? "text-blue-600" : "text-gray-300"
                                  }
                                />
                              </div>
                            </th>
                          ))}
                        </tr>
                      ))}
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-100">
                      {table.getRowModel().rows.map((row) => (
                        <tr
                          key={row.id}
                          className="hover:bg-blue-50/50 transition-colors cursor-pointer group"
                          onClick={(e) => {
                            const tag = (e.target as HTMLElement).tagName.toLowerCase();
                            if (
                              tag === "select" ||
                              tag === "option" ||
                              tag === "button" ||
                              tag === "img"
                            )
                              return;
                            const coords = row.original.coordinates;
                            if (coords) setFocusedLocation([coords.lat, coords.lng]);
                          }}
                        >
                          {row.getVisibleCells().map((cell) => (
                            <td key={cell.id} className="px-6 py-3">
                              {flexRender(cell.column.columnDef.cell, cell.getContext())}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>

              {/* Pagination Controls */}
              {filteredComplaints.length > 0 && (
                <div className="px-6 py-4 border-t border-gray-100 bg-white flex items-center justify-between">
                  <div className="text-sm text-gray-500">
                    Showing{" "}
                    {table.getState().pagination.pageIndex * table.getState().pagination.pageSize +
                      1}{" "}
                    to{" "}
                    {Math.min(
                      (table.getState().pagination.pageIndex + 1) *
                        table.getState().pagination.pageSize,
                      filteredComplaints.length,
                    )}{" "}
                    of {filteredComplaints.length} entries
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => table.previousPage()}
                      disabled={!table.getCanPreviousPage()}
                      className="px-3 py-1.5 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Previous
                    </button>
                    <div className="text-sm text-gray-600 font-medium px-2">
                      Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}
                    </div>
                    <button
                      onClick={() => table.nextPage()}
                      disabled={!table.getCanNextPage()}
                      className="px-3 py-1.5 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Lightbox Modal */}
          {lightboxImage && (
            <div
              role="dialog"
              aria-modal="true"
              aria-label="Enlarged complaint photo"
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
              onClick={() => setLightboxImage(null)}
              onKeyDown={(e) => {
                if (e.key === "Escape") setLightboxImage(null);
              }}
            >
              <div className="relative max-w-5xl w-full max-h-[90vh] flex items-center justify-center">
                <button
                  className="absolute -top-12 right-0 text-white hover:text-gray-300 p-2 text-xl font-bold bg-black/50 rounded-full w-10 h-10 flex items-center justify-center transition-colors"
                  onClick={() => setLightboxImage(null)}
                  autoFocus
                  aria-label="Close image viewer"
                >
                  ✕
                </button>
                <img
                  src={lightboxImage}
                  alt="Enlarged complaint photo"
                  className="max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl"
                  onClick={(e) => e.stopPropagation()}
                />
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
