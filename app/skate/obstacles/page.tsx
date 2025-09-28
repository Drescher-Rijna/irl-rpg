'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import PageWrapper from '@/components/ui/PageWrapper';
import { Card, CardContent } from '@/components/ui/Card';

type Obstacle = {
  id: string;
  name: string;
  type: string;
  difficulty: number;
};

const ObstaclesPage: React.FC = () => {
  const [obstacles, setObstacles] = useState<Obstacle[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchObstacles = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('obstacles')
        .select('*')
        .order('name', { ascending: true });

      if (error) throw error;
      // group by type
      if (data) {
        data.sort((a, b) => a.type.localeCompare(b.type));
      }

      setObstacles(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchObstacles();
  }, []);

  return (
    <PageWrapper>
      <h1 className="text-2xl font-bold mb-4">Obstacles</h1>
      {/* Obstacles List */}
      <div>
        {loading ? (
          <p className="text-center text-black">Loading obstacles...</p>
        ) : obstacles.length === 0 ? (
          <p className="text-center text-black">No obstacles yet.</p>
        ) : (
          <div>
            {Object.entries(
              obstacles.reduce<Record<string, typeof obstacles>>((acc, obs) => {
                if (!acc[obs.type]) acc[obs.type] = [];
                acc[obs.type].push(obs);
                return acc;
              }, {})
            ).map(([type, obsList]) => (
              <div key={type}>
                <h2 className="text-xl font-bold mb-2">{type}</h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {obsList.map((obstacle) => (
                    <Card key={obstacle.id} className="shadow-sm hover:shadow-md">
                      <CardContent className="p-4 text-center">
                        {obstacle.name} (Diff: {obstacle.difficulty})
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </PageWrapper>
  );
};

export default ObstaclesPage;
