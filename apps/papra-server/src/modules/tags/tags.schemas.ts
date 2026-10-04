import * as v from 'valibot';
import { createRegexSchema } from '../shared/schemas/string.schemas';
import { TagColorRegex, tagIdRegex } from './tags.constants';
import { formatTagName, isValidTagName, maxTagHierarchyDepth } from './tags.models';

export const tagIdSchema = createRegexSchema(tagIdRegex);

export const tagNameSchema = v.pipe(
  v.string(),
  v.trim(),
  // Tag names are hierarchy paths, `LA/School` is the `School` tag under the `LA` tag
  v.transform((name) => formatTagName({ name })),
  v.minLength(1),
  v.maxLength(64),
  v.check(
    (name) => isValidTagName({ name }),
    `Invalid tag name, hierarchies must use the "/" separator without empty levels and can have at most ${maxTagHierarchyDepth} levels`,
  ),
);

export const tagColorSchema = v.pipe(
  v.string(),
  v.toUpperCase(),
  v.regex(TagColorRegex, 'Invalid Color format, must be a hex color code like #000000'),
);

export const tagDescriptionSchema = v.pipe(v.string(), v.trim(), v.maxLength(256));

export const tagIsVisibleSchema = v.boolean();
