import React, { useState, useEffect, useCallback } from 'react';
import { Household, Member } from '../types';
import {
  getHouseholds,
  getHousehold,
  createHousehold,
  updateHousehold,
  deleteHousehold,
  createMember,
  updateMember,
  deleteMember,
} from '../api';
import { Button, Card, Input, Spinner } from '../components/common/UI';
import { MemberCard, MemberForm } from '../components/households/MemberCard';

type Modal =
  | null
  | { type: 'add_household' }
  | { type: 'edit_household'; household: Household }
  | { type: 'add_member'; householdId: string }
  | { type: 'edit_member'; member: Member };

export const HouseholdsPage: React.FC = () => {
  const [households, setHouseholds] = useState<Household[]>([]);
  const [selectedHousehold, setSelectedHousehold] = useState<Household | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [modal, setModal] = useState<Modal>(null);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [newHouseholdName, setNewHouseholdName] = useState('');

  const loadHouseholds = useCallback(async () => {
    setLoading(true);
    try {
      const list = await getHouseholds();
      setHouseholds(list);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadMembers = useCallback(async (householdId: string) => {
    try {
      const { members: ms, household: h } = await getHousehold(householdId);
      setMembers(ms);
      setSelectedHousehold(h);
    } catch {
      setMembers([]);
    }
  }, []);

  useEffect(() => { loadHouseholds(); }, [loadHouseholds]);

  const handleCreateHousehold = async () => {
    if (!newHouseholdName.trim()) return;
    setActionLoading(true);
    try {
      const h = await createHousehold(newHouseholdName.trim());
      setHouseholds(prev => [h, ...prev]);
      setNewHouseholdName('');
      setModal(null);
      setSelectedHousehold(h);
      setMembers([]);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteHousehold = async (id: string) => {
    if (!window.confirm('Delete this household and all its members?')) return;
    await deleteHousehold(id);
    setHouseholds(prev => prev.filter(h => h.id !== id));
    if (selectedHousehold?.id === id) {
      setSelectedHousehold(null);
      setMembers([]);
    }
  };

  const handleSaveMember = async (data: Partial<Member>) => {
    if (!selectedHousehold) return;
    setActionLoading(true);
    try {
      if (modal?.type === 'add_member') {
        const m = await createMember(selectedHousehold.id, data);
        setMembers(prev => [...prev, m]);
      } else if (modal?.type === 'edit_member') {
        const m = await updateMember(selectedHousehold.id, modal.member.id, data);
        setMembers(prev => prev.map(x => x.id === m.id ? m : x));
      }
      setModal(null);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteMember = async (member: Member) => {
    if (!window.confirm(`Remove ${member.name} from the household?`)) return;
    await deleteMember(selectedHousehold!.id, member.id);
    setMembers(prev => prev.filter(m => m.id !== member.id));
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-800">Households 🏠</h1>
        <Button size="sm" onClick={() => setModal({ type: 'add_household' })}>
          + New
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-8"><Spinner /></div>
      ) : households.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-6xl mb-3">🏡</p>
          <p className="text-slate-600 mb-4">No households yet. Create one to get started!</p>
          <Button onClick={() => setModal({ type: 'add_household' })}>Create Household</Button>
        </div>
      ) : (
        <div className="grid gap-3">
          {households.map(h => (
            <Card
              key={h.id}
              onClick={() => loadMembers(h.id)}
              selected={selectedHousehold?.id === h.id}
              className="p-4"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center text-xl">
                    🏠
                  </div>
                  <div>
                    <p className="font-semibold text-slate-800">{h.name}</p>
                    <p className="text-xs text-slate-400">
                      {new Date(h.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="danger"
                  onClick={e => { e.stopPropagation(); handleDeleteHousehold(h.id); }}
                >
                  Delete
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Members panel */}
      {selectedHousehold && (
        <div className="mt-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-bold text-slate-800">
              {selectedHousehold.name} — Members
            </h2>
            <Button
              size="sm"
              onClick={() => setModal({ type: 'add_member', householdId: selectedHousehold.id })}
            >
              + Add Member
            </Button>
          </div>

          {members.length === 0 ? (
            <div className="text-center py-8 border-2 border-dashed border-slate-200 rounded-xl">
              <p className="text-slate-500 text-sm">No members yet. Add family members or guests!</p>
            </div>
          ) : (
            <div className="space-y-2">
              {members.map(member => (
                <MemberCard
                  key={member.id}
                  member={member}
                  onEdit={() => setModal({ type: 'edit_member', member })}
                  onDelete={() => handleDeleteMember(member)}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Modal overlay */}
      {modal && (
        <div
          className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-4"
          onClick={() => setModal(null)}
        >
          <div
            className="bg-white rounded-2xl p-6 w-full max-w-md max-h-screen overflow-y-auto"
            onClick={e => e.stopPropagation()}
          >
            {(modal.type === 'add_household' || modal.type === 'edit_household') && (
              <>
                <h2 className="text-xl font-bold text-slate-800 mb-4">
                  {modal.type === 'add_household' ? 'New Household' : 'Edit Household'}
                </h2>
                <Input
                  label="Household name"
                  value={newHouseholdName}
                  onChange={e => setNewHouseholdName(e.target.value)}
                  placeholder="e.g. Silva Family"
                  onKeyDown={e => e.key === 'Enter' && handleCreateHousehold()}
                />
                <div className="flex gap-2 mt-4">
                  <Button
                    fullWidth
                    loading={actionLoading}
                    onClick={handleCreateHousehold}
                    disabled={!newHouseholdName.trim()}
                  >
                    Create
                  </Button>
                  <Button variant="secondary" fullWidth onClick={() => setModal(null)}>
                    Cancel
                  </Button>
                </div>
              </>
            )}

            {(modal.type === 'add_member' || modal.type === 'edit_member') && (
              <>
                <h2 className="text-xl font-bold text-slate-800 mb-4">
                  {modal.type === 'add_member' ? 'Add Member' : `Edit ${modal.member.name}`}
                </h2>
                <MemberForm
                  member={modal.type === 'edit_member' ? modal.member : {}}
                  onSave={handleSaveMember}
                  onCancel={() => setModal(null)}
                  loading={actionLoading}
                />
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
