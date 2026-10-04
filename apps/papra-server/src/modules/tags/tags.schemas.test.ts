import * as v from 'valibot';
import { describe, expect, test } from 'vitest';
import { maxTagHierarchyDepth } from './tags.models';
import { tagColorSchema, tagIsVisibleSchema, tagNameSchema } from './tags.schemas';

describe('tags schemas', () => {
  describe('tagColorSchema', () => {
    test('the color of a tag is a 6 digits hex color code', () => {
      expect(() => v.parse(tagColorSchema, '#FFFFFF')).not.toThrow();
      expect(() => v.parse(tagColorSchema, '#000000')).not.toThrow();
      expect(() => v.parse(tagColorSchema, '#123ABC')).not.toThrow();
      expect(() => v.parse(tagColorSchema, '#abcdef')).not.toThrow();

      expect(() => v.parse(tagColorSchema, 'FFFFFF')).toThrow();
      expect(() => v.parse(tagColorSchema, '#FFF')).toThrow();
      expect(() => v.parse(tagColorSchema, '#123ABCG')).toThrow();
      expect(() => v.parse(tagColorSchema, '#123AB')).toThrow();
      expect(() => v.parse(tagColorSchema, 'blue')).toThrow();
    });

    test('the color of a tag is always uppercased', () => {
      expect(v.parse(tagColorSchema, '#abcdef')).toBe('#ABCDEF');
      expect(v.parse(tagColorSchema, '#abCdEf')).toBe('#ABCDEF');
      expect(v.parse(tagColorSchema, '#123abc')).toBe('#123ABC');
    });
  });

  describe('tagNameSchema', () => {
    test('tag names can express a hierarchy with the "/" separator', () => {
      expect(v.parse(tagNameSchema, 'School')).toBe('School');
      expect(v.parse(tagNameSchema, 'LA/School')).toBe('LA/School');
    });

    test('hierarchy levels are trimmed and empty levels are removed', () => {
      expect(v.parse(tagNameSchema, ' LA / School ')).toBe('LA/School');
      expect(v.parse(tagNameSchema, 'LA//School')).toBe('LA/School');
      expect(v.parse(tagNameSchema, '/LA/School/')).toBe('LA/School');
    });

    test('empty names and too deep hierarchies are rejected', () => {
      expect(() => v.parse(tagNameSchema, '')).toThrow();
      expect(() => v.parse(tagNameSchema, '  /  ')).toThrow();
      expect(() =>
        v.parse(
          tagNameSchema,
          Array.from({ length: maxTagHierarchyDepth + 1 }, (_, i) => `l${i}`).join('/'),
        ),
      ).toThrow();
    });
  });

  describe('tagIsVisibleSchema', () => {
    test('the visibility of a tag is a boolean', () => {
      expect(v.parse(tagIsVisibleSchema, true)).toBe(true);
      expect(v.parse(tagIsVisibleSchema, false)).toBe(false);

      expect(() => v.parse(tagIsVisibleSchema, 'true')).toThrow();
    });
  });
});
