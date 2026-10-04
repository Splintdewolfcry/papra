import { describe, expect, test } from 'vitest';
import {
  formatTagName,
  getTagAncestorPaths,
  getTagDepth,
  getTagLeafName,
  getTagParentPath,
  isValidTagName,
  joinTagName,
  maxTagHierarchyDepth,
  splitTagName,
} from './tags.models';

describe('tags models', () => {
  describe('splitTagName', () => {
    test('a tag name is split on the hierarchy separator', () => {
      expect(splitTagName({ name: 'LA/School' })).to.eql(['LA', 'School']);
      expect(splitTagName({ name: 'School' })).to.eql(['School']);
      expect(splitTagName({ name: 'LA/School/Class' })).to.eql(['LA', 'School', 'Class']);
    });

    test('segments are trimmed', () => {
      expect(splitTagName({ name: 'LA / School' })).to.eql(['LA', 'School']);
    });
  });

  describe('joinTagName', () => {
    test('segments are joined with the hierarchy separator', () => {
      expect(joinTagName({ segments: ['LA', 'School'] })).to.eql('LA/School');
      expect(joinTagName({ segments: ['School'] })).to.eql('School');
    });
  });

  describe('formatTagName', () => {
    test('the hierarchy separator is normalized and empty levels are removed', () => {
      expect(formatTagName({ name: ' LA / School ' })).to.eql('LA/School');
      expect(formatTagName({ name: 'LA//School' })).to.eql('LA/School');
      expect(formatTagName({ name: '/LA/School/' })).to.eql('LA/School');
      expect(formatTagName({ name: 'School' })).to.eql('School');
    });
  });

  describe('isValidTagName', () => {
    test('a tag name is valid when all its levels are non empty', () => {
      expect(isValidTagName({ name: 'School' })).toBe(true);
      expect(isValidTagName({ name: 'LA/School' })).toBe(true);
    });

    test('a tag name is invalid when it has empty levels', () => {
      expect(isValidTagName({ name: '' })).toBe(false);
      expect(isValidTagName({ name: 'LA//School' })).toBe(false);
      expect(isValidTagName({ name: '/LA' })).toBe(false);
      expect(isValidTagName({ name: 'LA/' })).toBe(false);
    });

    test('a tag name is invalid when the hierarchy is too deep', () => {
      const atMaxDepth = Array.from({ length: maxTagHierarchyDepth }, (_, i) => `level-${i}`).join(
        '/',
      );
      const aboveMaxDepth = `${atMaxDepth}/too-deep`;

      expect(isValidTagName({ name: atMaxDepth })).toBe(true);
      expect(isValidTagName({ name: aboveMaxDepth })).toBe(false);
    });
  });

  describe('getTagDepth', () => {
    test('the depth is the number of levels in the hierarchy', () => {
      expect(getTagDepth({ name: 'School' })).toBe(1);
      expect(getTagDepth({ name: 'LA/School' })).toBe(2);
      expect(getTagDepth({ name: 'LA/School/Class' })).toBe(3);
    });
  });

  describe('getTagLeafName', () => {
    test('the leaf name is the last level of the hierarchy', () => {
      expect(getTagLeafName({ name: 'LA/School' })).to.eql('School');
      expect(getTagLeafName({ name: 'School' })).to.eql('School');
      expect(getTagLeafName({ name: 'LA/School/Class' })).to.eql('Class');
    });
  });

  describe('getTagParentPath', () => {
    test('the parent path is the hierarchy without its last level', () => {
      expect(getTagParentPath({ name: 'LA/School' })).to.eql('LA');
      expect(getTagParentPath({ name: 'LA/School/Class' })).to.eql('LA/School');
    });

    test('root tags have no parent', () => {
      expect(getTagParentPath({ name: 'School' })).toBe(null);
    });
  });

  describe('getTagAncestorPaths', () => {
    test('ancestors are returned from the root to the direct parent', () => {
      expect(getTagAncestorPaths({ name: 'LA/School/Class' })).to.eql(['LA', 'LA/School']);
      expect(getTagAncestorPaths({ name: 'LA/School' })).to.eql(['LA']);
      expect(getTagAncestorPaths({ name: 'School' })).to.eql([]);
    });
  });
});
