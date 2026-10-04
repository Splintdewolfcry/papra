export type Tag = {
  id: string;
  name: string;
  color: string;
  /**
   * Whether the tag is suggested in the tag pickers, defaults to true. Hidden tags are still
   * attached to documents.
   */
  isVisible?: boolean;
};
