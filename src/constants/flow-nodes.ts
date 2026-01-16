import { type FlowNodeType } from '@/ui/molecules/FlowEditor';

export const FLOW_NODES: FlowNodeType[] = [
  {
    type: 'simple',
    label: 'Simple Node',
    description: 'A basic node with title and text',
    initialData: {
      label: 'Node',
      description: 'A simple node',
    },
  },
  {
    type: 'start',
    label: 'Start',
    description: 'Algorithm start point',
    initialData: {
      label: 'Start',
      nodeType: 'start',
    },
  },
  {
    type: 'end',
    label: 'End',
    description: 'Algorithm end point',
    initialData: {
      label: 'End',
      nodeType: 'end',
    },
  },
  {
    type: 'process',
    label: 'Process',
    description: 'Processing step or action',
    initialData: {
      label: 'Process',
    },
  },
  {
    type: 'input-output',
    label: 'Input/Output',
    description: 'Data input or output operation',
    initialData: {
      label: 'Input/Output',
    },
  },
  {
    type: 'decision',
    label: 'Decision',
    description: 'Branching point (if/else)',
    initialData: {
      label: 'Decision?',
    },
  },
];
