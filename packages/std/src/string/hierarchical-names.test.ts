import { describe, expect, test } from 'vitest';
import { createHierarchicalName } from './hierarchical-names';

describe('hierarchical names', () => {
  const hierarchicalName = createHierarchicalName({ separator: '/', maxDepth: 3 });

  describe('split', () => {
    test('a name is split on the separator and its levels are trimmed', () => {
      expect(hierarchicalName.split({ name: 'LA/School' })).to.eql(['LA', 'School']);
      expect(hierarchicalName.split({ name: ' LA / School ' })).to.eql(['LA', 'School']);
      expect(hierarchicalName.split({ name: 'School' })).to.eql(['School']);
    });
  });

  describe('join', () => {
    test('levels are joined with the separator', () => {
      expect(hierarchicalName.join({ segments: ['LA', 'School'] })).toBe('LA/School');
      expect(hierarchicalName.join({ segments: ['School'] })).toBe('School');
    });
  });

  describe('format', () => {
    test('empty levels are removed and the separator is normalized', () => {
      expect(hierarchicalName.format({ name: ' LA / School ' })).toBe('LA/School');
      expect(hierarchicalName.format({ name: 'LA//School' })).toBe('LA/School');
      expect(hierarchicalName.format({ name: '/LA/School/' })).toBe('LA/School');
      expect(hierarchicalName.format({ name: 'School' })).toBe('School');
    });
  });

  describe('isValid', () => {
    test('a name is valid when all its levels are non empty', () => {
      expect(hierarchicalName.isValid({ name: 'School' })).toBe(true);
      expect(hierarchicalName.isValid({ name: 'LA/School' })).toBe(true);
    });

    test('a name is invalid when it has empty levels', () => {
      expect(hierarchicalName.isValid({ name: '' })).toBe(false);
      expect(hierarchicalName.isValid({ name: 'LA//School' })).toBe(false);
      expect(hierarchicalName.isValid({ name: '/LA' })).toBe(false);
      expect(hierarchicalName.isValid({ name: 'LA/' })).toBe(false);
    });

    test('a name is invalid when it is deeper than the maximum depth', () => {
      expect(hierarchicalName.isValid({ name: 'LA/School/Class' })).toBe(true);
      expect(hierarchicalName.isValid({ name: 'LA/School/Class/Room' })).toBe(false);
    });

    test('the depth is unlimited when no maximum depth is provided', () => {
      const unlimited = createHierarchicalName({ separator: '/' });

      expect(unlimited.isValid({ name: 'a/b/c/d/e/f' })).toBe(true);
    });
  });

  describe('depth', () => {
    test('the depth is the number of levels', () => {
      expect(hierarchicalName.depth({ name: 'School' })).toBe(1);
      expect(hierarchicalName.depth({ name: 'LA/School' })).toBe(2);
    });
  });

  describe('leafName', () => {
    test('the leaf name is the last level', () => {
      expect(hierarchicalName.leafName({ name: 'LA/School' })).toBe('School');
      expect(hierarchicalName.leafName({ name: 'School' })).toBe('School');
    });
  });

  describe('parentPath', () => {
    test('the parent path is the name without its last level', () => {
      expect(hierarchicalName.parentPath({ name: 'LA/School/Class' })).toBe('LA/School');
      expect(hierarchicalName.parentPath({ name: 'LA/School' })).toBe('LA');
    });

    test('root level names have no parent', () => {
      expect(hierarchicalName.parentPath({ name: 'School' })).toBe(null);
    });
  });

  describe('ancestorPaths', () => {
    test('ancestors are returned from the root to the direct parent', () => {
      expect(hierarchicalName.ancestorPaths({ name: 'LA/School/Class' })).to.eql([
        'LA',
        'LA/School',
      ]);
      expect(hierarchicalName.ancestorPaths({ name: 'School' })).to.eql([]);
    });
  });

  test('the separator is configurable', () => {
    const withDots = createHierarchicalName({ separator: '.' });

    expect(withDots.split({ name: 'fr.paris' })).to.eql(['fr', 'paris']);
    expect(withDots.format({ name: ' fr / paris ' })).toBe('fr / paris');
    expect(withDots.format({ name: 'fr..paris' })).toBe('fr.paris');
  });
});
