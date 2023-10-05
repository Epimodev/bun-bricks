type Counter = {
  increment: (label: string) => void;
  decrement: (label: string) => void;
  get: () => Record<string, number>;
};

export const createCounter = (): Counter => {
  const counts: Record<string, number> = {};

  return {
    increment: label => {
      counts[label] = (counts[label] ?? 0) + 1;
    },
    decrement: label => {
      counts[label] = (counts[label] ?? 0) - 1;
    },
    get: () => counts,
  };
};
