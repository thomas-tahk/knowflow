// Entry point for `npm run seed:flows`. Seeding lives behind a separate file so that
// importing seedFlows.ts (from tests, or anything else) cannot write to a database as a
// side effect — previously that was enforced by matching process.argv[1] against the
// filename, which silently never matched under vite-node and made the command a no-op.
import { seedFlows } from './seedFlows';

seedFlows();
