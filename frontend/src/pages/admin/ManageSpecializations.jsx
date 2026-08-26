import { useEffect, useState } from 'react';
import { FiPlus, FiBriefcase, FiFileText, FiEdit2, FiTrash2, FiX } from 'react-icons/fi';
import toast from 'react-hot-toast';
import api from '../../services/api';
import {
  ModernTableContainer,
  ModernTableHeader,
  ModernTableRow,
  ModernTableCell,
  ActionButton,
  EmptyState,
  LoadingState,
  MobileCard
} from '../../components/ui';

export default function ManageSpecializations() {
  const [list, setList] = useState([]);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingSpec, setEditingSpec] = useState(null);
  const [deletingSpec, setDeletingSpec] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.get('/specializations');
      setList(res.data.data || []);
    } catch {}
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!name) {
      toast.error('Name is required');
      return;
    }
    
    setSaving(true);
    const loadingToast = toast.loading('Adding specialization...');
    
    try {
      await api.post('/specializations', { name, description });
      toast.dismiss(loadingToast);
      toast.success('Specialization added successfully!');
      setName('');
      setDescription('');
      await load();
    } catch (e) {
      toast.dismiss(loadingToast);
      toast.error(e.response?.data?.message || 'Failed to add specialization.');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (spec) => {
    setEditingSpec({ ...spec });
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    if (!editingSpec.name) {
      toast.error('Name is required');
      return;
    }

    setSaving(true);
    const loadingToast = toast.loading('Updating specialization...');

    try {
      await api.put(`/specializations/${editingSpec._id}`, {
        name: editingSpec.name,
        description: editingSpec.description
      });
      toast.dismiss(loadingToast);
      toast.success('Specialization updated successfully!');
      setEditingSpec(null);
      await load();
    } catch (e) {
      toast.dismiss(loadingToast);
      toast.error(e.response?.data?.message || 'Failed to update specialization.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingSpec) return;

    setSaving(true);
    const loadingToast = toast.loading('Deleting specialization...');

    try {
      await api.delete(`/specializations/${deletingSpec._id}`);
      toast.dismiss(loadingToast);
      toast.success('Specialization deleted successfully!');
      setDeletingSpec(null);
      await load();
    } catch (e) {
      toast.dismiss(loadingToast);
      toast.error(e.response?.data?.message || 'Failed to delete specialization.');
    } finally {
      setSaving(false);
    }
  };

  const columns = [
    { label: 'Specialization', icon: <FiBriefcase className="w-4 h-4 text-primary" /> },
    { label: 'Description', icon: <FiFileText className="w-4 h-4 text-green-500" /> },
    { label: 'Actions', icon: null }
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-text-primary mb-1">Manage Specializations</h1>
        <p className="text-text-secondary text-sm">Add and manage medical specializations for doctors</p>
      </div>

      {/* Add New Specialization Form */}
      <div className="bg-bg-card rounded-2xl shadow-card border border-border-subtle p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary">
            <FiPlus className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-text-primary">Add New Specialization</h2>
            <p className="text-xs text-text-muted">Create a new medical specialization</p>
          </div>
        </div>

        <form onSubmit={onSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="name" className="block text-xs font-semibold uppercase tracking-wider text-text-secondary mb-1.5">
                Specialization Name *
              </label>
              <div className="relative">
                <FiBriefcase className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted w-4 h-4" />
                <input 
                  id="name"
                  type="text"
                  value={name} 
                  onChange={(e) => setName(e.target.value)} 
                  className="w-full pl-10 pr-4 py-2.5 bg-bg-input text-text-primary border border-border-subtle rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm placeholder:text-text-muted" 
                  placeholder="e.g., Cardiology, Neurology"
                  required
                />
              </div>
            </div>
            
            <div>
              <label htmlFor="description" className="block text-xs font-semibold uppercase tracking-wider text-text-secondary mb-1.5">
                Description
              </label>
              <div className="relative">
                <FiFileText className="absolute left-3.5 top-3 text-text-muted w-4 h-4" />
                <textarea 
                  id="description"
                  value={description} 
                  onChange={(e) => setDescription(e.target.value)} 
                  className="w-full pl-10 pr-4 py-2.5 bg-bg-input text-text-primary border border-border-subtle rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all resize-none text-sm placeholder:text-text-muted" 
                  placeholder="Brief description of the specialization"
                  rows="3"
                />
              </div>
            </div>
          </div>
          
          <ActionButton 
            type="submit"
            variant="primary"
            size="md"
            icon={<FiPlus className="w-4 h-4" />}
            disabled={saving}
            className="w-full md:w-auto"
          >
            {saving ? 'Adding Specialization...' : 'Add Specialization'}
          </ActionButton>
        </form>
      </div>

      {/* Specializations Table */}
      <div className="hidden md:block">
        <ModernTableContainer
          title="Medical Specializations"
          subtitle={`${list.length} specialization${list.length !== 1 ? 's' : ''} available`}
        >
          {loading ? (
            <LoadingState rows={5} />
          ) : list.length === 0 ? (
            <EmptyState
              icon={<FiBriefcase className="w-8 h-8 text-text-muted" />}
              title="No Specializations Found"
              description="Add your first medical specialization to get started."
            />
          ) : (
            <table className="min-w-full">
              <ModernTableHeader columns={columns} />
              <tbody>
                {list.map((specialization, index) => (
                  <ModernTableRow key={specialization._id} isEven={index % 2 === 0}>
                    <ModernTableCell>
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-primary/10 rounded-xl flex items-center justify-center text-primary">
                          <FiBriefcase className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="font-bold text-text-primary text-sm">{specialization.name}</div>
                          <div className="text-xs text-text-muted">Medical Specialization</div>
                        </div>
                      </div>
                    </ModernTableCell>
                    
                    <ModernTableCell>
                      <div className="text-text-secondary text-sm">
                        {specialization.description || (
                          <span className="text-text-muted italic text-xs">No description provided</span>
                        )}
                      </div>
                    </ModernTableCell>
                    
                    <ModernTableCell>
                      <div className="flex items-center gap-2">
                        <ActionButton
                          variant="secondary"
                          size="sm"
                          icon={<FiEdit2 className="w-4 h-4" />}
                          onClick={() => handleEdit(specialization)}
                          title="Edit"
                        >
                          Edit
                        </ActionButton>
                        <ActionButton
                          variant="danger"
                          size="sm"
                          icon={<FiTrash2 className="w-4 h-4" />}
                          onClick={() => setDeletingSpec(specialization)}
                          title="Delete"
                        >
                          Delete
                        </ActionButton>
                      </div>
                    </ModernTableCell>
                  </ModernTableRow>
                ))}
              </tbody>
            </table>
          )}
        </ModernTableContainer>
      </div>

      {/* Mobile Card View */}
      <div className="md:hidden space-y-4">
        {loading ? (
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, index) => (
              <MobileCard key={index}>
                <div className="animate-pulse">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-12 h-12 bg-bg-card-hover rounded-xl"></div>
                    <div className="flex-1">
                      <div className="h-4 bg-bg-card-hover rounded w-3/4 mb-2"></div>
                      <div className="h-3 bg-bg-card-hover rounded w-1/2"></div>
                    </div>
                  </div>
                </div>
              </MobileCard>
            ))}
          </div>
        ) : list.length === 0 ? (
          <MobileCard>
            <EmptyState
              icon={<FiBriefcase className="w-8 h-8 text-text-muted" />}
              title="No Specializations Found"
              description="Add your first medical specialization to get started."
            />
          </MobileCard>
        ) : (
          list.map((specialization) => (
            <MobileCard key={specialization._id}>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary">
                    <FiBriefcase className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold text-text-primary text-sm">{specialization.name}</h3>
                    <p className="text-xs text-text-muted">Medical Specialization</p>
                  </div>
                </div>
                
                {specialization.description && (
                  <div>
                    <label className="text-xs font-semibold text-text-muted uppercase tracking-wider">Description</label>
                    <p className="mt-1 text-sm text-text-secondary">{specialization.description}</p>
                  </div>
                )}

                <div className="flex gap-2 pt-3 border-t border-border-subtle">
                  <ActionButton
                    variant="secondary"
                    size="sm"
                    icon={<FiEdit2 className="w-4 h-4" />}
                    onClick={() => handleEdit(specialization)}
                    className="flex-1"
                  >
                    Edit
                  </ActionButton>
                  <ActionButton
                    variant="danger"
                    size="sm"
                    icon={<FiTrash2 className="w-4 h-4" />}
                    onClick={() => setDeletingSpec(specialization)}
                    className="flex-1"
                  >
                    Delete
                  </ActionButton>
                </div>
              </div>
            </MobileCard>
          ))
        )}
      </div>

      {/* Edit Modal */}
      {editingSpec && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4">
          <div className="bg-bg-card text-text-primary rounded-2xl shadow-2xl border border-border-subtle max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-6 pb-3 border-b border-border-subtle">
              <h2 className="text-lg font-bold text-text-primary">Edit Specialization</h2>
              <button
                onClick={() => setEditingSpec(null)}
                className="p-1 rounded-lg text-text-muted hover:text-text-primary hover:bg-bg-card-hover transition-colors"
                aria-label="Close dialog"
              >
                <FiX className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdate} className="space-y-4">
              <div>
                <label htmlFor="edit-name" className="block text-xs font-semibold uppercase tracking-wider text-text-secondary mb-1.5">
                  Specialization Name *
                </label>
                <input
                  id="edit-name"
                  type="text"
                  value={editingSpec.name}
                  onChange={(e) => setEditingSpec({ ...editingSpec, name: e.target.value })}
                  className="w-full px-4 py-2.5 bg-bg-input text-text-primary border border-border-subtle rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 text-sm"
                  required
                />
              </div>

              <div>
                <label htmlFor="edit-description" className="block text-xs font-semibold uppercase tracking-wider text-text-secondary mb-1.5">
                  Description
                </label>
                <textarea
                  id="edit-description"
                  value={editingSpec.description || ''}
                  onChange={(e) => setEditingSpec({ ...editingSpec, description: e.target.value })}
                  className="w-full px-4 py-2.5 bg-bg-input text-text-primary border border-border-subtle rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none text-sm"
                  rows="3"
                />
              </div>

              <div className="flex gap-3 pt-4 border-t border-border-subtle">
                <button
                  type="button"
                  onClick={() => setEditingSpec(null)}
                  className="flex-1 px-4 py-2.5 border border-border-subtle rounded-xl text-text-secondary hover:bg-bg-card-hover transition-colors font-medium text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 px-4 py-2.5 bg-primary text-white rounded-xl hover:bg-primary-hover transition-colors font-semibold text-sm shadow-md disabled:opacity-50"
                >
                  {saving ? 'Updating...' : 'Update'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingSpec && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4">
          <div className="bg-bg-card text-text-primary rounded-2xl shadow-2xl border border-border-subtle max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-border-subtle">
              <h2 className="text-lg font-bold text-text-primary">Confirm Delete</h2>
              <button
                onClick={() => setDeletingSpec(null)}
                className="p-1 rounded-lg text-text-muted hover:text-text-primary hover:bg-bg-card-hover transition-colors"
                aria-label="Close dialog"
              >
                <FiX className="w-5 h-5" />
              </button>
            </div>

            <div className="mb-6 space-y-2">
              <p className="text-text-primary text-sm">
                Are you sure you want to delete the specialization{' '}
                <span className="font-bold text-primary">"{deletingSpec.name}"</span>?
              </p>
              <p className="text-xs text-red-500 font-medium">
                This action cannot be undone.
              </p>
            </div>

            <div className="flex gap-3 pt-3 border-t border-border-subtle">
              <button
                type="button"
                onClick={() => setDeletingSpec(null)}
                className="flex-1 px-4 py-2.5 border border-border-subtle rounded-xl text-text-secondary hover:bg-bg-card-hover transition-colors font-medium text-sm"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={saving}
                className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-colors font-semibold text-sm shadow-md disabled:opacity-50"
              >
                {saving ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}