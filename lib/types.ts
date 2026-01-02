export interface DitherItem {
  id: string;
  title: string | null;
  imageUrl: string | null;
  visibility: string;
  status: string;
  createdAt: Date;
  userId: string;
  userName: string | null;
  userImage: string | null;
  userCustomAvatar: string | null;
}
