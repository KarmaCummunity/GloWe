import type { HierarchySnapshot } from '@kc/domain';
import type { IOrgHierarchyRepository } from './IOrgHierarchyRepository';

/**
 * FR-ADMIN-028 — loads the raw inputs of the layered hierarchy view.
 *
 * Fetches the named role-holders (all visible orgs) and the aggregate census
 * concurrently so both halves describe the same moment. Folding into strata
 * stays in the domain (`buildHierarchyPyramid`) so the UI can re-focus on an
 * org without another round trip.
 */
export class GetHierarchySnapshotUseCase {
  constructor(private readonly repo: IOrgHierarchyRepository) {}

  async execute(): Promise<HierarchySnapshot> {
    const [members, census] = await Promise.all([
      this.repo.getOrgTree(null),
      this.repo.getHierarchyCensus(),
    ]);
    return { members, census };
  }
}
