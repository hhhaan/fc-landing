/**
 * Compact flavor vocabulary for table cupping (Phase 1).
 * Not a full SCA wheel — short enough to tap on a phone.
 */
export const DESCRIPTOR_GROUPS: { id: string; label: string; tags: string[] }[] = [
    {
        id: 'fruit',
        label: 'Fruit',
        tags: ['citrus', 'berry', 'stone fruit', 'tropical', 'apple', 'grape', 'dried fruit'],
    },
    {
        id: 'sweet',
        label: 'Sweet',
        tags: ['honey', 'caramel', 'brown sugar', 'molasses', 'chocolate', 'cocoa', 'vanilla'],
    },
    {
        id: 'floral',
        label: 'Floral',
        tags: ['floral', 'jasmine', 'rose', 'bergamot'],
    },
    {
        id: 'nut',
        label: 'Nut / spice',
        tags: ['nutty', 'almond', 'hazelnut', 'spice', 'cinnamon', 'clove', 'pepper'],
    },
    {
        id: 'roast',
        label: 'Roast / other',
        tags: ['toasted', 'smoky', 'woody', 'earthy', 'herbal', 'tea-like', 'clean', 'juicy', 'creamy'],
    },
];

export const ALL_DESCRIPTOR_TAGS: string[] = DESCRIPTOR_GROUPS.flatMap((g) => g.tags);
