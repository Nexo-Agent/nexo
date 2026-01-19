import { SimpleNode, type SimpleNodeData } from './SimpleNode';
import { RichNode, type RichNodeData } from './RichNode';
import { GroupNode, type GroupNodeData } from './GroupNode';
import {
  ProcessNode,
  InputOutputNode,
  DecisionNode,
  StartEndNode,
} from './AlgorithmNodes';

export {
  SimpleNode,
  type SimpleNodeData,
  RichNode,
  type RichNodeData,
  GroupNode,
  type GroupNodeData,
  ProcessNode,
  InputOutputNode,
  DecisionNode,
  StartEndNode,
};

export const nodeTypes = {
  simple: SimpleNode,
  rich: RichNode,
  group: GroupNode,
  start: StartEndNode,
  end: StartEndNode,
  process: ProcessNode,
  'input-output': InputOutputNode,
  decision: DecisionNode,
};
