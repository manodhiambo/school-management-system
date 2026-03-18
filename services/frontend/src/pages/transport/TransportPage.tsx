import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import api from '@/services/api';
import { Bus, Plus, Edit, Trash2, Search, Users, X, CheckSquare, Square } from 'lucide-react';

export function TransportPage() {
  const qc = useQueryClient();
  const [showRouteForm, setShowRouteForm] = useState(false);
  const [showAssignPanel, setShowAssignPanel] = useState(false);
  const [selectedRoute, setSelectedRoute] = useState<any>(null);
  const [editingRoute, setEditingRoute] = useState<any>(null);

  const EMPTY_ROUTE = {
    route_name: '', route_code: '', vehicle_registration: '', vehicle_capacity: 30,
    driver_name: '', driver_phone: '', morning_pickup_time: '',
    afternoon_dropoff_time: '', monthly_fee: 0, term_fee: 0,
    fare_per_km: 0, distance_km: 0,
  };
  const [routeForm, setRouteForm] = useState<any>({ ...EMPTY_ROUTE });

  // Bulk assign state
  const [studentSearch, setStudentSearch] = useState('');
  const [selectedStudentIds, setSelectedStudentIds] = useState<Set<string>>(new Set());
  const [bulkPickupStop, setBulkPickupStop] = useState('');
  const [bulkDropoffStop, setBulkDropoffStop] = useState('');

  const { data: routesData, isLoading } = useQuery({
    queryKey: ['transport-routes'],
    queryFn: () => (api as any).getTransportRoutes(),
  });
  const { data: routeDetailData } = useQuery({
    queryKey: ['transport-route', selectedRoute?.id],
    queryFn: () => (api as any).getTransportRoute(selectedRoute.id),
    enabled: !!selectedRoute?.id,
  });
  const { data: studentsData } = useQuery({
    queryKey: ['students-all'],
    queryFn: () => api.getStudents(),
    enabled: showAssignPanel,
  });

  const createRouteMutation = useMutation({
    mutationFn: (data: any) => (api as any).createTransportRoute(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['transport-routes'] });
      setShowRouteForm(false);
      setRouteForm({ ...EMPTY_ROUTE });
      setEditingRoute(null);
    },
  });

  const updateRouteMutation = useMutation({
    mutationFn: ({ id, data }: any) => (api as any).updateTransportRoute(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['transport-routes'] });
      qc.invalidateQueries({ queryKey: ['transport-route', editingRoute?.id] });
      setShowRouteForm(false);
      setRouteForm({ ...EMPTY_ROUTE });
      setEditingRoute(null);
    },
  });

  const deleteRouteMutation = useMutation({
    mutationFn: (id: string) => (api as any).deleteTransportRoute(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['transport-routes'] });
      setSelectedRoute(null);
    },
  });

  const bulkAssignMutation = useMutation({
    mutationFn: (data: any) => (api as any).bulkAssignStudentTransport(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['transport-route', selectedRoute?.id] });
      qc.invalidateQueries({ queryKey: ['transport-routes'] });
      setShowAssignPanel(false);
      setSelectedStudentIds(new Set());
      setStudentSearch('');
      setBulkPickupStop('');
      setBulkDropoffStop('');
    },
  });

  const removeMutation = useMutation({
    mutationFn: (id: string) => (api as any).removeStudentTransport(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['transport-route', selectedRoute?.id] }),
  });

  const routes = (routesData as any)?.data || [];
  const routeDetail = (routeDetailData as any)?.data;
  const allStudents = (studentsData as any)?.data || [];

  // Students already on this route
  const assignedStudentIds = useMemo(
    () => new Set((routeDetail?.students || []).map((s: any) => s.student_id)),
    [routeDetail?.students]
  );

  // Filter students: not already assigned + search term
  const filteredStudents = useMemo(() => {
    const term = studentSearch.toLowerCase().trim();
    return allStudents.filter((s: any) => {
      if (assignedStudentIds.has(s.id)) return false;
      if (!term) return true;
      const name = `${s.first_name} ${s.last_name}`.toLowerCase();
      const adm = (s.admission_number || '').toLowerCase();
      return name.includes(term) || adm.includes(term);
    });
  }, [allStudents, assignedStudentIds, studentSearch]);

  function toggleStudent(id: string) {
    setSelectedStudentIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    if (selectedStudentIds.size === filteredStudents.length) {
      setSelectedStudentIds(new Set());
    } else {
      setSelectedStudentIds(new Set(filteredStudents.map((s: any) => s.id)));
    }
  }

  function openAssignPanel() {
    setShowAssignPanel(true);
    setSelectedStudentIds(new Set());
    setStudentSearch('');
    setBulkPickupStop('');
    setBulkDropoffStop('');
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Transport Management</h1>
          <p className="text-sm text-gray-500 mt-1">Manage school bus routes and student assignments</p>
        </div>
        <Button onClick={() => setShowRouteForm(!showRouteForm)}>
          <Plus className="h-4 w-4 mr-2" /> Add Route
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card><CardContent className="pt-4">
          <p className="text-2xl font-bold text-indigo-600">{routes.length}</p>
          <p className="text-sm text-gray-500 mt-1">Active Routes</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4">
          <p className="text-2xl font-bold text-green-600">
            {routes.reduce((s: number, r: any) => s + (parseInt(r.student_count) || 0), 0)}
          </p>
          <p className="text-sm text-gray-500 mt-1">Students on Transport</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4">
          <p className="text-2xl font-bold text-blue-600">
            {routes.reduce((s: number, r: any) => s + (r.vehicle_capacity || 0), 0)}
          </p>
          <p className="text-sm text-gray-500 mt-1">Total Capacity</p>
        </CardContent></Card>
      </div>

      {/* Add / Edit Route Form */}
      {showRouteForm && (
        <Card className="border-indigo-200">
          <CardHeader><CardTitle className="text-lg">{editingRoute ? 'Edit Route' : 'New Transport Route'}</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={e => {
              e.preventDefault();
              if (editingRoute) {
                updateRouteMutation.mutate({ id: editingRoute.id, data: routeForm });
              } else {
                createRouteMutation.mutate(routeForm);
              }
            }} className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div><Label>Route Name *</Label>
                <Input value={routeForm.route_name} onChange={e => setRouteForm({ ...routeForm, route_name: e.target.value })} required />
              </div>
              <div><Label>Route Code</Label>
                <Input value={routeForm.route_code} onChange={e => setRouteForm({ ...routeForm, route_code: e.target.value })} placeholder="e.g. RT01" />
              </div>
              <div><Label>Vehicle Registration</Label>
                <Input value={routeForm.vehicle_registration} onChange={e => setRouteForm({ ...routeForm, vehicle_registration: e.target.value })} placeholder="KCB 123A" />
              </div>
              <div><Label>Capacity</Label>
                <Input type="number" value={routeForm.vehicle_capacity} onChange={e => setRouteForm({ ...routeForm, vehicle_capacity: parseInt(e.target.value) })} />
              </div>
              <div><Label>Driver Name</Label>
                <Input value={routeForm.driver_name} onChange={e => setRouteForm({ ...routeForm, driver_name: e.target.value })} />
              </div>
              <div><Label>Driver Phone</Label>
                <Input value={routeForm.driver_phone} onChange={e => setRouteForm({ ...routeForm, driver_phone: e.target.value })} placeholder="0712345678" />
              </div>

              <div className="md:col-span-3 border-t pt-3">
                <p className="text-sm font-semibold text-gray-700 mb-3">Transport Fees</p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <Label>Monthly Fee (KES)</Label>
                    <Input type="number" value={routeForm.monthly_fee} onChange={e => setRouteForm({ ...routeForm, monthly_fee: parseFloat(e.target.value) || 0 })} />
                  </div>
                  <div>
                    <Label>Term Fee (KES)</Label>
                    <Input type="number" value={routeForm.term_fee} onChange={e => setRouteForm({ ...routeForm, term_fee: parseFloat(e.target.value) || 0 })} />
                    <p className="text-xs text-gray-400 mt-0.5">Used for bulk invoice generation</p>
                  </div>
                  <div>
                    <Label>Distance (km)</Label>
                    <Input type="number" step="0.1" value={routeForm.distance_km} onChange={e => setRouteForm({ ...routeForm, distance_km: parseFloat(e.target.value) || 0 })} placeholder="e.g. 12.5" />
                  </div>
                  <div>
                    <Label>Fare per km (KES)</Label>
                    <Input type="number" step="0.5" value={routeForm.fare_per_km} onChange={e => setRouteForm({ ...routeForm, fare_per_km: parseFloat(e.target.value) || 0 })} placeholder="e.g. 50" />
                    {routeForm.distance_km > 0 && routeForm.fare_per_km > 0 && (
                      <p className="text-xs text-green-600 mt-0.5">
                        = KES {(routeForm.distance_km * routeForm.fare_per_km).toLocaleString()}/trip
                      </p>
                    )}
                  </div>
                </div>
              </div>

              <div><Label>Morning Pickup</Label>
                <Input type="time" value={routeForm.morning_pickup_time} onChange={e => setRouteForm({ ...routeForm, morning_pickup_time: e.target.value })} />
              </div>
              <div><Label>Afternoon Drop-off</Label>
                <Input type="time" value={routeForm.afternoon_dropoff_time} onChange={e => setRouteForm({ ...routeForm, afternoon_dropoff_time: e.target.value })} />
              </div>
              <div className="md:col-span-3 flex gap-3">
                <Button type="submit" disabled={createRouteMutation.isPending || updateRouteMutation.isPending}>
                  {(createRouteMutation.isPending || updateRouteMutation.isPending) ? 'Saving...' : (editingRoute ? 'Update Route' : 'Add Route')}
                </Button>
                <Button type="button" variant="outline" onClick={() => { setShowRouteForm(false); setEditingRoute(null); }}>Cancel</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Routes List */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader><CardTitle className="text-base">Routes ({routes.length})</CardTitle></CardHeader>
            <CardContent className="p-0">
              {isLoading ? <p className="p-4 text-sm text-gray-500">Loading...</p>
                : routes.length === 0 ? (
                  <div className="p-6 text-center">
                    <Bus className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                    <p className="text-sm text-gray-500">No routes configured.</p>
                  </div>
                ) : (
                  <div className="divide-y">
                    {routes.map((r: any) => (
                      <button key={r.id} onClick={() => { setSelectedRoute(r); setShowAssignPanel(false); }}
                        className={`w-full text-left px-4 py-3 hover:bg-gray-50 ${selectedRoute?.id === r.id ? 'bg-indigo-50' : ''}`}>
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium text-sm">{r.route_name}</p>
                            <p className="text-xs text-gray-500">{r.vehicle_registration || 'No vehicle'}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-semibold text-indigo-600">{r.student_count || 0}</p>
                            <p className="text-xs text-gray-400">students</p>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
            </CardContent>
          </Card>
        </div>

        {/* Route Detail */}
        <div className="lg:col-span-2">
          {!selectedRoute ? (
            <Card>
              <CardContent className="p-8 text-center">
                <Bus className="h-10 w-10 text-gray-300 mx-auto mb-2" />
                <p className="text-gray-500">Select a route to view details.</p>
              </CardContent>
            </Card>
          ) : routeDetail ? (
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <CardTitle>{routeDetail.route_name} {routeDetail.route_code && <span className="text-sm font-normal text-gray-400">({routeDetail.route_code})</span>}</CardTitle>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => {
                        setEditingRoute(routeDetail);
                        setRouteForm({
                          route_name: routeDetail.route_name || '',
                          route_code: routeDetail.route_code || '',
                          vehicle_registration: routeDetail.vehicle_registration || '',
                          vehicle_capacity: routeDetail.vehicle_capacity || 30,
                          driver_name: routeDetail.driver_name || '',
                          driver_phone: routeDetail.driver_phone || '',
                          morning_pickup_time: routeDetail.morning_pickup_time || '',
                          afternoon_dropoff_time: routeDetail.afternoon_dropoff_time || '',
                          monthly_fee: routeDetail.monthly_fee || 0,
                          term_fee: routeDetail.term_fee || 0,
                          fare_per_km: routeDetail.fare_per_km || 0,
                          distance_km: routeDetail.distance_km || 0,
                        });
                        setShowRouteForm(true);
                      }}>
                        <Edit className="h-4 w-4 mr-1" /> Edit
                      </Button>
                      <Button size="sm" variant="outline" className="text-red-600" onClick={() => {
                        if (confirm(`Delete route "${routeDetail.route_name}"? Students assigned will be unlinked.`)) {
                          deleteRouteMutation.mutate(routeDetail.id);
                        }
                      }}>
                        <Trash2 className="h-4 w-4 mr-1" /> Delete
                      </Button>
                      <Button size="sm" onClick={openAssignPanel}>
                        <Users className="h-4 w-4 mr-1" /> Add Students
                      </Button>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm text-gray-600 mt-2">
                    {routeDetail.driver_name && (
                      <p><span className="font-medium">Driver:</span> {routeDetail.driver_name} {routeDetail.driver_phone && `(${routeDetail.driver_phone})`}</p>
                    )}
                    {routeDetail.vehicle_registration && (
                      <p><span className="font-medium">Vehicle:</span> {routeDetail.vehicle_registration}</p>
                    )}
                    {routeDetail.morning_pickup_time && (
                      <p><span className="font-medium">Morning:</span> {routeDetail.morning_pickup_time}</p>
                    )}
                    {Number(routeDetail.term_fee) > 0 && (
                      <p><span className="font-medium">Term Fee:</span> KES {Number(routeDetail.term_fee).toLocaleString()}</p>
                    )}
                    {Number(routeDetail.distance_km) > 0 && (
                      <p><span className="font-medium">Distance:</span> {routeDetail.distance_km} km</p>
                    )}
                    {Number(routeDetail.fare_per_km) > 0 && (
                      <p><span className="font-medium">Fare/km:</span> KES {Number(routeDetail.fare_per_km).toLocaleString()}</p>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <h3 className="font-semibold text-sm mb-2">Assigned Students ({routeDetail.students?.length || 0})</h3>
                  {!routeDetail.students?.length ? (
                    <p className="text-sm text-gray-500">No students assigned. Click "Add Students" to assign.</p>
                  ) : (
                    <div className="space-y-2">
                      {routeDetail.students.map((s: any) => (
                        <div key={s.id} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2">
                          <div>
                            <p className="text-sm font-medium">{s.student_name}</p>
                            <p className="text-xs text-gray-500">{s.class_name} · {s.pickup_stop || 'No stop specified'}</p>
                          </div>
                          <Button size="sm" variant="ghost" onClick={() => removeMutation.mutate(s.id)}
                            className="text-red-600 h-7 text-xs">Remove</Button>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Bulk Student Assignment Panel */}
              {showAssignPanel && (
                <Card className="border-indigo-200">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base">Add Students to {routeDetail.route_name}</CardTitle>
                      <Button size="sm" variant="ghost" onClick={() => setShowAssignPanel(false)}>
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Shared stop fields */}
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label>Pickup Stop (shared)</Label>
                        <Input
                          placeholder="e.g. Westlands Stage"
                          value={bulkPickupStop}
                          onChange={e => setBulkPickupStop(e.target.value)}
                        />
                      </div>
                      <div>
                        <Label>Drop-off Stop (shared)</Label>
                        <Input
                          placeholder="e.g. School Gate"
                          value={bulkDropoffStop}
                          onChange={e => setBulkDropoffStop(e.target.value)}
                        />
                      </div>
                    </div>

                    {/* Search bar */}
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        className="pl-9"
                        placeholder="Search by name or admission number..."
                        value={studentSearch}
                        onChange={e => setStudentSearch(e.target.value)}
                      />
                    </div>

                    {/* Select all / count */}
                    <div className="flex items-center justify-between text-sm">
                      <button
                        type="button"
                        onClick={toggleAll}
                        className="flex items-center gap-1.5 text-indigo-600 hover:text-indigo-800 font-medium"
                      >
                        {selectedStudentIds.size === filteredStudents.length && filteredStudents.length > 0
                          ? <CheckSquare className="h-4 w-4" />
                          : <Square className="h-4 w-4" />}
                        {selectedStudentIds.size === filteredStudents.length && filteredStudents.length > 0
                          ? 'Deselect all'
                          : `Select all (${filteredStudents.length})`}
                      </button>
                      {selectedStudentIds.size > 0 && (
                        <span className="text-indigo-600 font-medium">{selectedStudentIds.size} selected</span>
                      )}
                    </div>

                    {/* Student list */}
                    <div className="border rounded-lg divide-y max-h-72 overflow-y-auto">
                      {studentsData === undefined ? (
                        <p className="p-4 text-sm text-gray-500 text-center">Loading students...</p>
                      ) : filteredStudents.length === 0 ? (
                        <p className="p-4 text-sm text-gray-500 text-center">
                          {studentSearch ? 'No students match your search.' : 'All students are already assigned to this route.'}
                        </p>
                      ) : (
                        filteredStudents.map((s: any) => {
                          const checked = selectedStudentIds.has(s.id);
                          return (
                            <button
                              key={s.id}
                              type="button"
                              onClick={() => toggleStudent(s.id)}
                              className={`w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-gray-50 transition-colors ${checked ? 'bg-indigo-50' : ''}`}
                            >
                              {checked
                                ? <CheckSquare className="h-4 w-4 text-indigo-600 flex-shrink-0" />
                                : <Square className="h-4 w-4 text-gray-300 flex-shrink-0" />}
                              <div className="min-w-0">
                                <p className="text-sm font-medium text-gray-900 truncate">{s.first_name} {s.last_name}</p>
                                <p className="text-xs text-gray-500">{s.admission_number || ''}{s.class_name ? ` · ${s.class_name}` : ''}</p>
                              </div>
                            </button>
                          );
                        })
                      )}
                    </div>

                    {/* Submit */}
                    <div className="flex gap-3 pt-1">
                      <Button
                        disabled={selectedStudentIds.size === 0 || bulkAssignMutation.isPending}
                        onClick={() => {
                          bulkAssignMutation.mutate({
                            route_id: selectedRoute.id,
                            student_ids: Array.from(selectedStudentIds),
                            pickup_stop: bulkPickupStop || null,
                            dropoff_stop: bulkDropoffStop || null,
                          });
                        }}
                      >
                        {bulkAssignMutation.isPending
                          ? 'Adding...'
                          : `Add ${selectedStudentIds.size > 0 ? selectedStudentIds.size : ''} Student${selectedStudentIds.size !== 1 ? 's' : ''}`}
                      </Button>
                      <Button variant="outline" onClick={() => setShowAssignPanel(false)}>Cancel</Button>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          ) : (
            <Card><CardContent className="p-8 text-center text-gray-500">Loading...</CardContent></Card>
          )}
        </div>
      </div>
    </div>
  );
}
