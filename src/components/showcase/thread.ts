/**
 * THE THREAD's landing point. The gallery's rail publishes where its centre node is (an element and
 * an offset inside it, so scrolling needs no new message), and the 3D web draws its crimson strand
 * down to exactly that point. Plain module state: one gallery, one web, no React re-renders.
 */
export type RailNode = { el: HTMLElement; x: number; y: number };

let node: RailNode | null = null;
const subs = new Set<() => void>();

export const railNode = {
  get: () => node,
  set(n: RailNode | null) {
    node = n;
    subs.forEach((f) => f());
  },
  on(f: () => void) {
    subs.add(f);
    return () => {
      subs.delete(f);
    };
  },
};
