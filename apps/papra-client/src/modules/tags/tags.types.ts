export type Tag = {
  id: string;
  name: string;
  color: string;
  description: string | null;
  documentsCount: number;
  organizationId: string;
  /**
   * Whether the tag is suggested in the tag pickers. Hidden tags can still be attached to documents.
   */
  isVisible: boolean;
  createdAt: Date;
  updatedAt: Date;
};
