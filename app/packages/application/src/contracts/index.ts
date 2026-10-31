// Port contract tests (G39): framework-agnostic cases + assertions, one module per port.
export type { ContractCase } from './types';
export {
  ContractViolation,
  assertDefined,
  assertEqual,
  assertRejectsWithCode,
  assertSameList,
  assertTrue,
} from './assert';
export {
  newPostInput,
  postRepositoryContract,
  type PostRepositoryActor,
  type PostRepositoryContractContext,
} from './postRepository.contract';
