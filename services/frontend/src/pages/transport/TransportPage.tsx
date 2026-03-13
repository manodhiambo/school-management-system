import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import api from '@/services/api';
import { Bus, Plus } from 'lucide-react';

export function TransportPage() {
  const qc = useQueryClient();
  const [showRouteForm, setShowRouteForm] = useState(false);
  const [showAssignForm, setShowAssignForm] = useState(false);
  const [selectedRoute, setSelectedRoute] = useState<any>(null);
  const [routeForm, setRouteForm] = useState<any>({
    route_name: '', vehicle_registration: '', vehicle_capacity: 30,
    driver_name: '', driver_phone: '', morning_pickup_time: '',
    afternoon_dropoff_time: '', monthly_fee: 0,
  });
  const [assignForm, setAssignForm] = useState<any>({ student_id: '', pickup_stop: '', dropoff_stop: '' });

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
    enabled: showAssignForm,
  });

  const createRouteMutation = useMutation({
    mutationFn: (data: any) => (api as any).createTransportRoute(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['transport-routes'] }); setShowRouteForm(false); },
  });
  const assignMutation = useMutation({
    mutationFn: (data: any) => (api as any).assignStudentTransport(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['transport-route', selectedRoute?.id] });
      setShowAssignForm(false);
      setAssignForm({ student_id: '', pickup_stop: '', dropoff_stop: '' });
    },
  });
  const removeMutation = useMutation({
    mutationFn: (id: string) => (api as any).removeStudentTransport(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['transport-route', selectedRoute?.id] }),
  });

  const routes = (routesData as any)?.data || [];
  const routeDetail = (routeDetailData as any)?.data;
  const allStudents = (studentsData as any)?.data || [];

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

      {/* Add Route Form */}
      {showRouteForm && (
        <Card className="border-indigo-200">
          <CardHeader><CardTitle className="text-lg">New Transport Route</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={e => { e.preventDefault(); createRouteMutation.mutate(routeForm); }}
              className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div><Label>Route Name *</Label>
                <Input value={routeForm.route_name} onChange={e => setRouteForm({ ...routeForm, route_name: e.target.value })} required />
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
              <div><Label>Monthly Fee (KES)</Label>
                <Input type="number" value={routeForm.monthly_fee} onChange={e => setRouteForm({ ...routeForm, monthly_fee: parseFloat(e.target.value) })} />
              </div>
              <div><Label>Morning Pickup</Label>
                <Input type="time" value={routeForm.morning_pickup_time} onChange={e => setRouteForm({ ...routeForm, morning_pickup_time: e.target.value })} />
              </div>
              <div><Label>Afternoon Drop-off</Label>
                <Input type="time" value={routeForm.afternoon_dropoff_time} onChange={e => setRouteForm({ ...routeForm, afternoon_dropoff_time: e.target.value })} />
              </div>
              <div className="md:col-span-3 flex gap-3">
                <Button type="submit" disabled={createRouteMutation.isPending}>
                  {createRouteMutation.isPending ? 'Saving...' : 'Add Route'}
                </Button>
                <Button type="button" variant="outline" onClick={() => setShowRouteForm(false)}>Cancel</Button>
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
                      <button key={r.id} onClick={() => setSelectedRoute(r)}
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
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>{routeDetail.route_name}</CardTitle>
                  <Button size="sm" onClick={() => setShowAssignForm(!showAssignForm)}>
                    <Plus className="h-4 w-4 mr-1" /> Assign Student
                  </Button>
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm text-gray-600 mt-2">
                  {routeDetail.driver_name && (
                    <p><span className="font-medium">Driver:</span> {routeDetail.driver_name} ({routeDetail.driver_phone})</p>
                  )}
                  {routeDetail.vehicle_registration && (
                    <p><span className="font-medium">Vehicle:</span> {routeDetail.vehicle_registration}</p>
                  )}
                  {routeDetail.morning_pickup_time && (
                    <p><span className="font-medium">Morning:</span> {routeDetail.morning_pickup_time}</p>
                  )}
                  {routeDetail.monthly_fee > 0 && (
                    <p><span className="font-medium">Monthly Fee:</span> KES {Number(routeDetail.monthly_fee).toLocaleString()}</p>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {showAssignForm && (
                  <form onSubmit={e => { e.preventDefault(); assignMutation.mutate({ ...assignForm, route_id: selectedRoute.id }); }}
                    className="grid grid-cols-2 gap-3 mb-4 p-3 bg-indigo-50 rounded-lg">
                    <div className="col-span-2">
                      <Label>Student *</Label>
                      <select className="w-full border rounded-md px-3 py-2 text-sm mt-1"
                        value={assignForm.student_id} onChange={e => setAssignForm({ ...assignForm, student_id: e.target.value })} required>
                        <option value="">Select student</option>
                        {allStudents.map((s: any) => (
                          <option key={s.id} value={s.id}>{s.first_name} {s.last_name}</option>
                        ))}
                      </select>
                    </div>
                    <div><Label>Pickup Stop</Label><Input value={assignForm.pickup_stop} onChange={e => setAssignForm({ ...assignForm, pickup_stop: e.target.value })} /></div>
                    <div><Label>Drop-off Stop</Label><Input value={assignForm.dropoff_stop} onChange={e => setAssignForm({ ...assignForm, dropoff_stop: e.target.value })} /></div>
                    <div className="col-span-2 flex gap-2">
                      <Button type="submit" size="sm" disabled={assignMutation.isPending}>Assign</Button>
                      <Button type="button" size="sm" variant="outline" onClick={() => setShowAssignForm(false)}>Cancel</Button>
                    </div>
                  </form>
                )}
                <h3 className="font-semibold text-sm mb-2">Students ({routeDetail.students?.length || 0})</h3>
                {!routeDetail.students?.length ? (
                  <p className="text-sm text-gray-500">No students assigned to this route.</p>
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
          ) : (
            <Card><CardContent className="p-8 text-center text-gray-500">Loading...</CardContent></Card>
          )}
        </div>
      </div>
    </div>
  );
}
