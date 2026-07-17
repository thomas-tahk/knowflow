import { describe, it, expect } from 'vitest';
import { STARTER_FLOWS, STARTER_GROUPS } from './starterFlows';
import { getPreset } from '../core/presets';

const ids = new Set(STARTER_FLOWS.map(f => f.id));

describe('starter flows', () => {
  it('has the expected flows, all starter: prefixed', () => {
    expect([...ids].sort()).toEqual(
      [
        'starter:2fa',
        'starter:disabled-account',
        'starter:reset-password',
        'starter:sec-compromised-account',
        'starter:sec-darkweb-password',
        'starter:sec-intake',
        'starter:sec-lets-talk',
        'starter:sec-malware',
        'starter:sec-ownership-map',
        'starter:sec-phishing',
        'starter:sec-remediation',
        'starter:set-no2fa-ou',
        'starter:verification',
      ],
    );
    for (const f of STARTER_FLOWS) expect(f.id.startsWith('starter:')).toBe(true);
  });

  it('each flow validates clean against its preset', () => {
    for (const f of STARTER_FLOWS) {
      expect(getPreset(f.preset).validate(f), `${f.id} should validate`).toEqual([]);
    }
  });

  it('every block id is unique within its flow', () => {
    for (const f of STARTER_FLOWS) {
      const bids = f.blocks.map(b => b.id);
      expect(new Set(bids).size, `${f.id} has duplicate block ids`).toBe(bids.length);
    }
  });

  it('every connection references blocks that exist', () => {
    for (const f of STARTER_FLOWS) {
      const bids = new Set(f.blocks.map(b => b.id));
      for (const c of f.connections) {
        expect(bids.has(c.from), `${f.id} conn ${c.id} bad from`).toBe(true);
        expect(bids.has(c.to), `${f.id} conn ${c.id} bad to`).toBe(true);
      }
    }
  });

  it('every linkTo resolves to a starter flow', () => {
    for (const f of STARTER_FLOWS) {
      for (const b of f.blocks) {
        if (b.linkTo) expect(ids.has(b.linkTo), `${f.id}/${b.id} → ${b.linkTo}`).toBe(true);
      }
    }
  });

  it('has at least one door (linkTo) across the set', () => {
    const doors = STARTER_FLOWS.flatMap(f => f.blocks).filter(b => b.linkTo);
    expect(doors.length).toBeGreaterThan(0);
  });
});

describe('starter groups', () => {
  it('partitions every starter into exactly one topic — no orphans, no duplicates', () => {
    const grouped = STARTER_GROUPS.flatMap(g => g.flows.map(f => f.id));
    expect(grouped.slice().sort()).toEqual([...ids].sort()); // covers all, each once
  });

  it('preserves flat display order (groups concatenated == STARTER_FLOWS)', () => {
    expect(STARTER_GROUPS.flatMap(g => g.flows)).toEqual(STARTER_FLOWS);
  });

  it('titles are unique and non-empty', () => {
    const titles = STARTER_GROUPS.map(g => g.title);
    expect(new Set(titles).size).toBe(titles.length);
    for (const t of titles) expect(t.length).toBeGreaterThan(0);
  });
});
