import { useEffect, useState } from 'react';
import { Plus, Users, Pencil, Trash2, Loader2, AlertCircle } from 'lucide-react';
import api from '../../services/api.js';
import Modal from '../../components/ui/Modal.jsx';
import Skeleton from '../../components/ui/Skeleton.jsx';
import EmptyState from '../../components/ui/EmptyState.jsx';

const FamilyDependents = () => {
  const [dependents, setDependents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingDependent, setEditingDependent] = useState(null);
  const [deleteDependent, setDeleteDependent] = useState(null);

  // Form state
  const [form, setForm] = useState({
    name: '',
    relation: 'spouse',
    age: '',
    gender: 'male',
  });
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const fetchDependents = async () => {
    setLoading(true);
    try {
      const res = await api.get('/dependents');
      setDependents(res.data.dependents);
    } catch (error) {
      console.error('Failed to fetch dependents:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDependents();
  }, []);

  const openAddModal = () => {
    setEditingDependent(null);
    setForm({
      name: '',
      relation: 'spouse',
      age: '',
      gender: 'male',
    });
    setFormError('');
    setShowModal(true);
  };

  const openEditModal = (dep) => {
    setEditingDependent(dep);
    setForm({
      name: dep.name,
      relation: dep.relation,
      age: dep.age,
      gender: dep.gender,
    });
    setFormError('');
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!form.name || !form.name.trim()) {
      setFormError('Please provide a name');
      return;
    }
    if (form.age === '' || isNaN(form.age) || Number(form.age) < 0) {
      setFormError('Please provide a valid age (0 or greater)');
      return;
    }

    setSubmitting(true);
    try {
      if (editingDependent) {
        // Update API
        const res = await api.put(`/dependents/${editingDependent._id}`, {
          name: form.name.trim(),
          relation: form.relation,
          age: Number(form.age),
          gender: form.gender,
        });
        setDependents((prev) =>
          prev.map((d) => (d._id === editingDependent._id ? res.data.dependent : d))
        );
      } else {
        // Create API
        const res = await api.post('/dependents', {
          name: form.name.trim(),
          relation: form.relation,
          age: Number(form.age),
          gender: form.gender,
        });
        setDependents((prev) => [res.data.dependent, ...prev]);
      }
      setShowModal(false);
    } catch (error) {
      setFormError(error.response?.data?.message || 'Something went wrong. Please check your details.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteDependent) return;
    setDeleting(true);
    try {
      await api.delete(`/dependents/${deleteDependent._id}`);
      setDependents((prev) => prev.filter((d) => d._id !== deleteDependent._id));
      setDeleteDependent(null);
    } catch (error) {
      console.error('Failed to delete dependent:', error);
    } finally {
      setDeleting(false);
    }
  };

  const getRelationBadgeStyles = (relation) => {
    switch (relation) {
      case 'spouse':
        return 'bg-purple-500/20 text-purple-300 border-purple-500/30';
      case 'child':
        return 'bg-sky-500/20 text-sky-300 border-sky-500/30';
      case 'parent':
        return 'bg-amber-500/20 text-amber-300 border-amber-500/30';
      case 'sibling':
        return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30';
      default:
        return 'bg-pink-500/20 text-pink-300 border-pink-500/30';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Users size={24} className="text-accent-start" />
            Family & Dependents
          </h1>
          <p className="text-gray-400 text-sm mt-1 max-w-2xl">
            Add family members to customize health coverage calculations and age/gender-specific government schemes.
          </p>
        </div>
        <button
          onClick={openAddModal}
          className="btn-primary flex items-center gap-2 self-start shadow-glow hover:scale-[1.02] active:scale-[0.98] transition-transform duration-150"
        >
          <Plus size={18} />
          Add Dependent
        </button>
      </div>

      {/* Main Grid / Layout */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-44" />
          ))}
        </div>
      ) : dependents.length === 0 ? (
        <div className="glass-card p-12 text-center flex flex-col items-center justify-center">
          <EmptyState
            icon={Users}
            title="No family members added yet"
            subtitle="Add family members to start customizing coverage calculations and government welfare schemes."
          />
          <button
            onClick={openAddModal}
            className="btn-primary mt-6 flex items-center gap-2 shadow-glow hover:scale-[1.02] active:scale-[0.98] transition-transform"
          >
            <Plus size={18} />
            Add Your First Dependent
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {dependents.map((dep) => (
            <div
              key={dep._id}
              className="glass-card p-6 flex flex-col justify-between hover:border-white/20 transition-all duration-300 group"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-3">
                  <h3 className="font-semibold text-white text-lg truncate group-hover:text-accent-start transition-colors">
                    {dep.name}
                  </h3>
                  <span
                    className={`text-xs px-2.5 py-0.5 rounded-full border capitalize shrink-0 font-medium ${getRelationBadgeStyles(
                      dep.relation
                    )}`}
                  >
                    {dep.relation}
                  </span>
                </div>

                <div className="space-y-1.5 text-sm text-gray-400">
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-accent-start" />
                    <span>Age: <strong className="text-white">{dep.age}</strong> years</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-accent-end" />
                    <span>Gender: <strong className="text-white capitalize">{dep.gender}</strong></span>
                  </div>
                </div>
              </div>

              {/* Actions Footer */}
              <div className="flex items-center justify-end gap-3 mt-6 pt-4 border-t border-white/5">
                <button
                  onClick={() => openEditModal(dep)}
                  className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-all"
                  title="Edit details"
                >
                  <Pencil size={16} />
                </button>
                <button
                  onClick={() => setDeleteDependent(dep)}
                  className="p-2 rounded-lg text-gray-400 hover:text-red-400 hover:bg-red-500/10 transition-all"
                  title="Remove member"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add / Edit Dependent Modal */}
      <Modal
        open={showModal}
        onClose={() => setShowModal(false)}
        title={editingDependent ? 'Edit Dependent Details' : 'Add New Dependent'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {formError && (
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-center gap-2">
              <AlertCircle size={18} className="shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          <div>
            <label className="label-text">Full Name</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="e.g. John Doe"
              className="input-field"
              maxLength={50}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label-text">Relationship</label>
              <select
                value={form.relation}
                onChange={(e) => setForm({ ...form, relation: e.target.value })}
                className="input-field cursor-pointer"
              >
                <option value="spouse">Spouse</option>
                <option value="child">Child</option>
                <option value="parent">Parent</option>
                <option value="sibling">Sibling</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div>
              <label className="label-text">Age</label>
              <input
                type="number"
                value={form.age}
                onChange={(e) => setForm({ ...form, age: e.target.value })}
                placeholder="0"
                min="0"
                max="125"
                className="input-field"
              />
            </div>
          </div>

          <div>
            <label className="label-text">Gender</label>
            <div className="grid grid-cols-3 gap-3">
              {['male', 'female', 'other'].map((g) => (
                <button
                  key={g}
                  type="button"
                  onClick={() => setForm({ ...form, gender: g })}
                  className={`py-2.5 rounded-xl text-sm font-medium border capitalize transition-all duration-200 ${
                    form.gender === g
                      ? 'bg-gradient-accent text-white border-transparent shadow-glow font-semibold'
                      : 'bg-white/5 text-gray-400 border-white/10 hover:text-white hover:bg-white/10'
                  }`}
                >
                  {g}
                </button>
              ))}
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={submitting}
              className="btn-primary w-full flex items-center justify-center gap-2 hover:scale-[1.01] active:scale-[0.99] transition-transform duration-150"
            >
              {submitting && <Loader2 size={18} className="animate-spin" />}
              {submitting
                ? editingDependent
                  ? 'Saving...'
                  : 'Adding...'
                : editingDependent
                ? 'Save Changes'
                : 'Add Family Member'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        open={!!deleteDependent}
        onClose={() => setDeleteDependent(null)}
        title="Remove Family Member"
      >
        <div className="space-y-4">
          <p className="text-gray-300 text-sm leading-relaxed">
            Are you sure you want to remove <span className="text-white font-semibold">{deleteDependent?.name}</span>? This action cannot be undone and will delete all associated records.
          </p>
          <div className="flex gap-3 justify-end pt-2">
            <button
              onClick={() => setDeleteDependent(null)}
              className="btn-secondary text-sm px-4 py-2 hover:bg-white/20"
            >
              Cancel
            </button>
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="px-5 py-2 rounded-full bg-red-500 hover:bg-red-600 text-white font-semibold text-sm transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              {deleting && <Loader2 size={16} className="animate-spin" />}
              {deleting ? 'Removing...' : 'Remove'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default FamilyDependents;
