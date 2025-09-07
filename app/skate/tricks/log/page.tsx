'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import TrickLogForm from '../components/TrickLogForm';

type Log = {
  id: string;
  trick_name: string;
  stance: string;
  obstacle_name: string;
  attempts: number;
  landed: number;
  consistency: number; // 0–10
  date: string;
};

const TrickLogPage: React.FC = () => {
  const [logs, setLogs] = useState<Log[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('trick_logs')
        .select(`
          id,
          attempts,
          landed,
          date,
          trick_id (
            name,
            stance
          ),
          obstacle_id (
            name
          )
        `)
        .order('date', { ascending: false });

      if (error) throw error;

      const mapped: Log[] = data.map((log: any) => ({
        id: log.id,
        trick_name: log.trick_id.name,
        stance: log.trick_id.stance,
        obstacle_name: log.obstacle_id.name,
        attempts: log.attempts,
        landed: log.landed,
        consistency: Math.round((log.landed / log.attempts) * 10),
        date: log.date
      }));

      setLogs(mapped);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Log Trick Session</h1>

      {/* Trick Log Form */}
      <div className="mb-6">
        <TrickLogForm onSuccess={fetchLogs} />
      </div>

      {/* Past Logs */}
      <div>
        <h2 className="text-xl font-semibold mb-2">Past Logs</h2>
        {loading ? (
          <p>Loading logs...</p>
        ) : logs.length === 0 ? (
          <p>No logs yet.</p>
        ) : (
          <ul className="space-y-2">
            {logs.map(log => (
              <li key={log.id} className="border rounded p-2 shadow-sm">
                <p className="font-medium">
                  {log.trick_name} ({log.stance}) on {log.obstacle_name}
                </p>
                <p className="text-sm text-gray-600">
                  Attempts: {log.attempts}, Landed: {log.landed}, Consistency: {log.consistency}/10
                </p>
                <p className="text-xs text-gray-400">Date: {new Date(log.date).toLocaleDateString()}</p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default TrickLogPage;
