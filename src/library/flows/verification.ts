import type { KnowflowDoc } from '../../core/types';

const AT = '2026-07-15T00:00:00.000Z';

export const verification: KnowflowDoc = {
  id: 'starter:verification',
  title: 'Verification',
  description: 'Reusable: confirm who the caller is before making account changes.',
  preset: 'flowchart',
  blocks: [
    { id: 'v-q1', type: 'decision', text: 'Staff, or Student / Parent?' },
    { id: 'v-staff', type: 'step', text: 'Get name and eNumber (ID), plus ONE of: Department / Location, or previous ticket info' },
    { id: 'v-sp', type: 'step', text: 'Get student ID and student name' },
    { id: 'v-q2', type: 'decision', text: 'Who is actually on the call?' },
    { id: 'v-student', type: 'step', text: 'Get school and grade' },
    { id: 'v-parent', type: 'step', text: 'Get parent name, email, home address (also ask school and grade)' },
    { id: 'v-sfs', type: 'step', text: 'Also verify them as Staff' },
    { id: 'v-gate', type: 'decision', text: 'Could the customer provide the required info?' },
    { id: 'v-ok', type: 'outcome', text: 'Identity verified — return to your flow' },
    { id: 'v-inperson', type: 'decision', text: 'Can the customer visit Tech Oasis in person?' },
    { id: 'v-oasis', type: 'outcome', text: 'Refer out to Tech Oasis (customer goes there in person)' },
    { id: 'v-field', type: 'outcome', text: 'Refer out to a field tech (tech visits the customer)' },
    { id: 'v-callback', type: 'outcome', text: 'Customer gathers info and calls back later (or gives up)' },
  ],
  connections: [
    { id: 'vc1', from: 'v-q1', to: 'v-staff', label: 'Staff' },
    { id: 'vc2', from: 'v-q1', to: 'v-sp', label: 'Student / Parent' },
    { id: 'vc3', from: 'v-staff', to: 'v-gate' },
    { id: 'vc4', from: 'v-sp', to: 'v-q2' },
    { id: 'vc5', from: 'v-q2', to: 'v-student', label: 'Student' },
    { id: 'vc6', from: 'v-q2', to: 'v-parent', label: 'Parent' },
    { id: 'vc7', from: 'v-q2', to: 'v-sfs', label: 'Staff for a student' },
    { id: 'vc8', from: 'v-sfs', to: 'v-staff' },
    { id: 'vc9', from: 'v-student', to: 'v-gate' },
    { id: 'vc10', from: 'v-parent', to: 'v-gate' },
    { id: 'vc11', from: 'v-gate', to: 'v-ok', label: 'Yes' },
    { id: 'vc12', from: 'v-gate', to: 'v-inperson', label: 'No — verify in person' },
    { id: 'vc13', from: 'v-gate', to: 'v-callback', label: 'No — will follow up' },
    { id: 'vc14', from: 'v-inperson', to: 'v-oasis', label: 'Yes' },
    { id: 'vc15', from: 'v-inperson', to: 'v-field', label: 'No' },
  ],
  meta: { author: 'knowflow', createdAt: AT, updatedAt: AT, status: 'official', version: 1 },
};
