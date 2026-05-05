"use client";

import { useMemo, useState } from "react";

type Member = {
  id: string;
  key: string;
  name: string;
  isAdmin: boolean;
};

type Props = {
  initialMembers: Member[];
  currentAdminKey: string;
};

export default function AdminMembersPanel({
  initialMembers,
  currentAdminKey,
}: Props) {
  const [members, setMembers] = useState<Member[]>(initialMembers);
  const [newName, setNewName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const adminCount = useMemo(
    () => members.filter((m) => m.isAdmin).length,
    [members],
  );

  async function addMember(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/members", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName }),
      });
      const data = (await res.json()) as { error?: string; member?: Member };
      if (!res.ok || !data.member)
        throw new Error(data.error ?? "Tallennus epäonnistui");
      const createdMember = data.member;
      setMembers((prev) => [...prev, createdMember].sort(sortMembers));
      setNewName("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Jotain meni pieleen.");
    } finally {
      setLoading(false);
    }
  }

  async function toggleAdmin(member: Member) {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/members", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: member.key, isAdmin: !member.isAdmin }),
      });
      const data = (await res.json()) as { error?: string; member?: Member };
      if (!res.ok || !data.member)
        throw new Error(data.error ?? "Päivitys epäonnistui");
      const updatedMember = data.member;
      setMembers((prev) =>
        prev.map((m) => (m.key === updatedMember.key ? updatedMember : m)).sort(sortMembers),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Jotain meni pieleen.");
    } finally {
      setLoading(false);
    }
  }

  async function removeMember(member: Member) {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/members", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: member.key }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Jäsenen poisto epäonnistui");
      setMembers((prev) => prev.filter((m) => m.key !== member.key).sort(sortMembers));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Jotain meni pieleen.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mt-4 space-y-4">
      <form onSubmit={addMember} className="flex flex-col gap-2 sm:flex-row">
        <input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="Uusi jäsen"
          className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 outline-none ring-zinc-400 focus:ring-2 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-50"
        />
        <button
          type="submit"
          disabled={loading || !newName.trim()}
          className="rounded-lg bg-zinc-900 px-3 py-2 text-sm text-white disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
        >
          Lisää
        </button>
      </form>

      {error ? <p className="text-sm text-red-600 dark:text-red-400">{error}</p> : null}

      <div className="overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800">
        <table className="w-full min-w-[560px] text-left text-sm">
          <thead className="border-b border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900/50">
            <tr>
              <th className="px-3 py-2 font-medium text-zinc-600">Nimi</th>
              <th className="px-3 py-2 font-medium text-zinc-600">Ylläpito</th>
              <th className="px-3 py-2 font-medium text-zinc-600">Toiminto</th>
            </tr>
          </thead>
          <tbody>
            {members.map((member) => {
              const blockingLastAdmin = member.isAdmin && adminCount <= 1;
              const blockingSelf = member.key === currentAdminKey;
              const disableRemove = blockingLastAdmin || blockingSelf;
              const disableToggle = blockingSelf || (member.isAdmin && blockingLastAdmin);
              return (
                <tr key={member.id} className="border-b border-zinc-100 last:border-0 dark:border-zinc-800/80">
                  <td className="px-3 py-2">{member.name}</td>
                  <td className="px-3 py-2">
                    <button
                      type="button"
                      disabled={loading || disableToggle}
                      onClick={() => void toggleAdmin(member)}
                      className="rounded border border-zinc-300 px-2 py-1 text-xs disabled:opacity-40 dark:border-zinc-700"
                    >
                      {member.isAdmin ? "Kyllä" : "Ei"}
                    </button>
                  </td>
                  <td className="px-3 py-2">
                    <button
                      type="button"
                      disabled={loading || disableRemove}
                      onClick={() => void removeMember(member)}
                      className="rounded border border-red-300 px-2 py-1 text-xs text-red-700 disabled:opacity-40 dark:border-red-900 dark:text-red-300"
                    >
                      Poista
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function sortMembers(a: Member, b: Member): number {
  if (a.isAdmin !== b.isAdmin) return a.isAdmin ? -1 : 1;
  return a.name.localeCompare(b.name, "fi");
}
