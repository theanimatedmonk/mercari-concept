export const DEMO_CONTEXT =
  'I love the shape and neckline, but this is probably too dramatic. Looking for something I could wear to a wedding.';

export const DEMO_INSPIRATION = '/inspiration/editorial-dress.jpg';

export const DRESS_CENTER = { x: 50, y: 48 };

export const expansions: Record<string, { id: string; label: string }[]> = {
  elegant: [
    { id: 'refined', label: 'Refined' },
    { id: 'sophisticated', label: 'Sophisticated' },
    { id: 'timeless', label: 'Timeless' },
    { id: 'minimal', label: 'Minimal' },
  ],
  architectural: [
    { id: 'structured', label: 'Structured' },
    { id: 'sharpLines', label: 'Sharp lines' },
    { id: 'sculptural', label: 'Sculptural' },
    { id: 'asymmetric', label: 'Asymmetric' },
  ],
  romantic: [
    { id: 'soft', label: 'Soft' },
    { id: 'feminine', label: 'Feminine' },
    { id: 'flowing', label: 'Flowing' },
    { id: 'delicate', label: 'Delicate' },
  ],
};
