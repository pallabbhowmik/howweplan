export type DemoAgent = {
  agentId: string;
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
  commissionRate?: number;
};

export const demoAgents: DemoAgent[] = [
  {
    // Seeded in docker/init-db/02-seed.sql
    agentId: 'b0000000-0000-0000-0000-000000000001',
    userId: 'a0000000-0000-0000-0000-000000000002',
    email: 'star.agent@howweplan.com',
    firstName: 'Sarah',
    lastName: 'Star',
    commissionRate: 0.1,
  },
  {
    agentId: 'b0000000-0000-0000-0000-000000000002',
    userId: 'a0000000-0000-0000-0000-000000000003',
    email: 'bench.agent@howweplan.com',
    firstName: 'Ben',
    lastName: 'Benchley',
    commissionRate: 0.1,
  },
];
