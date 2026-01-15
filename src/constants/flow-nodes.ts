import { type FlowNodeType } from '@/ui/molecules/FlowEditor';

export const ALGORITHM_NODES: FlowNodeType[] = [
  {
    type: 'algorithm', // Start/End
    label: 'Start/End',
    description: 'Bắt đầu hoặc kết thúc luồng',
    initialData: { label: 'Start' },
    className:
      'rounded-full border-2 border-green-500 bg-green-50 dark:bg-green-950/20 px-8 py-3 min-w-[140px] text-center font-bold text-green-700 dark:text-green-400',
  },
  {
    type: 'algorithm', // Process
    label: 'Process',
    description: 'Thực hiện một hành động hoặc tính toán',
    initialData: { label: 'Process Step' },
    className:
      'rounded-md border-2 border-blue-500 bg-blue-50 dark:bg-blue-950/20 px-6 py-4 min-w-[180px] text-center text-blue-700 dark:text-blue-400',
  },
  {
    type: 'algorithm', // Decision
    label: 'Decision',
    description: 'Kiểm tra điều kiện rẽ nhánh (Hình thoi)',
    initialData: { label: 'Is Valid?' },
    className:
      'border-2 border-yellow-500 bg-yellow-50 dark:bg-yellow-950/20 px-10 py-10 min-w-[160px] text-center text-yellow-700 dark:text-yellow-400',
    style: {
      clipPath: 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)',
    },
  },
  {
    type: 'algorithm', // Input/Output
    label: 'Input/Output',
    description: 'Nhập hoặc xuất dữ liệu (Hình bình hành)',
    initialData: { label: 'Data Input' },
    className:
      'border-2 border-purple-500 bg-purple-50 dark:bg-purple-950/20 px-8 py-4 min-w-[180px] text-center text-purple-700 dark:text-purple-400',
    style: {
      clipPath: 'polygon(15% 0%, 100% 0%, 85% 100%, 0% 100%)',
    },
  },
  {
    type: 'algorithm', // Subprocess
    label: 'Subprocess',
    description: 'Một quy trình con đã được định nghĩa',
    initialData: { label: 'Subroutine' },
    className:
      'rounded-none border-x-8 border-y-2 border-cyan-500 bg-cyan-50 dark:bg-cyan-950/20 px-6 py-4 min-w-[180px] text-center text-cyan-700 dark:text-cyan-400',
  },
];
