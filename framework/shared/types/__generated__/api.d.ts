interface BatchedApiParams {
  apis: {
    name: string;
    params: JsonObj;
  }[];
}

interface BlockUserApiParams {
  blockeeId: number;
}

interface ChatApiParams {
  chatId: number;
}

interface ChatsApiParams {
  limit?: number;
  cursor?: string;
}

interface CheckEntityExistsApiParams {
  entityType: string;
  entityId: number | string;
}

interface CityApiParams {
  lat: number;
  lng: number;
}

interface ClubApiParams {
  id?: number;
  name?: string;
}

interface ClubsApiParams {
  clubNames?: string[];
  search?: string;
  parentClubId?: number | null;
  parentClubName?: string | null;
  siblingClubId?: number | null;
  onlyJoined?: boolean;
  includeParents?: boolean;
  showAdult?: boolean;
  limit?: number;
  cursor?: string;
}

interface ClubViewApiParams {
  clubName: string;
}

interface CreateChatApiParams {
  recipientIds: number[];
  content: string;
}

interface CreateClubApiParams {
  id?: number;
  parentClubName: string;
  name: string;
  description?: string;
}

interface CreatePostApiParams {
  clubName: string;
  content?: string | null;
  media?: Express.Multer.File;
  location?: 'city' | 'global';
}

interface CreateReactionApiParams {
  entityType: 'post' | 'postReply' | 'chatReply' | 'roomReply';
  entityId: number;
  reactType: string;
}

interface CreateReplyApiParams {
  replyType: 'postReply' | 'roomReply' | 'chatReply';
  parentEntityId: number;
  parentReplyId?: number;
  content: string;
}

interface CreateReportApiParams {
  entityType: 'post' | 'postReply' | 'roomReply' | 'user';
  entityId: number;
}

interface CreateRoomApiParams {
  clubId: number;
  cityId: number | null;
}

interface CurrentUserApiParams {

}

interface DeletePostApiParams {
  postId: number;
}

interface DeleteReactionApiParams {
  entityType: 'post' | 'postReply' | 'chatReply' | 'roomReply';
  entityId: number;
}

interface DeleteReplyApiParams {
  replyType: 'postReply' | 'roomReply' | 'chatReply';
  replyId: number;
}

interface ExistingChatWithUserApiParams {
  userId: number;
}

interface FavoriteClubsApiParams {
  clubName: string;
}

interface FollowUserApiParams {
  followeeId: number;
}

interface JoinClubsApiParams {
  clubIds: number[];
}

interface LeaveClubApiParams {
  clubId: number;
}

interface LoginUserApiParams {
  email: string;
  password: string;
}

interface NotifsApiParams {
  limit?: number;
  cursor?: string;
}

interface OnboardCompleteProfileApiParams {

}

interface PostApiParams {
  postId: number;
}

interface PostReplyThreadsApiParams {
  limit?: number;
  cursor?: string;
}

interface PostsApiParams {
  clubName: string;
  unauthClubs: string[];
  location: 'city' | 'global';
  authorId?: number;
  limit?: number;
  sort?: 'hot' | 'lastReply' | 'new';
  cursor?: string;
}

interface RandomUsersApiParams {
  location: 'city' | 'global';
  limit?: number;
}

interface ReadChatApiParams {
  chatId: number;
}

interface ReadNotifApiParams {
  notifId: number;
}

interface RegisterUserApiParams {
  email: string;
  password: string;
  name: string;
  birthday: string;
}

interface RelatedUsersApiParams {
  unauthClubs: string[];
  location: 'city' | 'global';
  lowQualityUsers?: boolean;
  cursor?: string;
  limit?: number;
}

interface RepliesApiParams {
  replyType: 'postReply' | 'roomReply' | 'chatReply';
  parentEntityId: number;
  parentReplyId?: number;
  oldestFirst?: boolean;
  initialId?: number;
  limit?: number;
  cursor?: string;
}

interface ReplyApiParams {
  replyType: 'postReply' | 'roomReply' | 'chatReply';
  replyId: number;
}

interface ResetPasswordApiParams {
  email: string;
}

interface RoomApiParams {
  roomId: number;
}

interface RoomsApiParams {
  clubName: string;
  unauthClubs: string[];
  location: 'city' | 'global';
  limit?: number;
  cursor?: string;
}

interface SearchCitiesApiParams {
  name: string;
  lat?: number;
  lng?: number;
  limit?: number;
}

interface SeenNotifsApiParams {
  notifType: 'notifs' | 'chats';
}

interface SseOtpApiParams {

}

interface SseSubscribeApiParams {
  sessionId: string;
  events: {
    name: string;
    params: JsonObj;
  }[];
}

interface SseUnsubscribeApiParams {
  sessionId: string;
  events: {
    name: string;
    params: JsonObj;
  }[];
}

interface TopLevelClubsApiParams {
  showAdult?: boolean;
  order?: 'members' | 'name' | 'membersWithJitter';
}

interface TopPostRepliesApiParams {
  postId: number;
  numReplies: number;
}

interface TopUsersApiParams {
  unauthClubs: string[];
  cursor?: string;
  limit?: number;
}

interface UnblockUserApiParams {
  blockeeId: number;
}

interface UnfollowUserApiParams {
  followeeId: number;
}

interface UnreadChatsCountApiParams {

}

interface UnseenNotifIdsApiParams {

}

interface UpdateAccountSettingsApiParams {
  email?: string;
  newPassword?: string;
  currentPassword: string;
}

interface UpdateCurrentUserApiParams {
  name: string;
  birthday: string;
  cityId?: number | null;
  school?: string | null;
  jobTitle?: string | null;
  jobCompany?: string | null;
  bio?: string;
  coverPhotos?: Express.Multer.File[];
  coverPhotoSlots: {
    fileIdx?: number;
    url?: string;
  }[];
  photo?: Express.Multer.File;
  clearedPhoto?: boolean;
  clubIdsOrder: number[];
  clubsPrivacy: {
    clubId: number;
    privacy: 'public' | 'mutual' | 'private';
  }[];
}

interface UpdateUserCityApiParams {
  cityId: number | null;
}

interface UserApiParams {
  userId: number;
}

interface UserClubsWithPostsApiParams {
  userId: number;
  unauthClubs: string[];
  cursor?: string;
  limit?: number;
}

interface UserFollowsApiParams {
  userId: number;
  followType: 'followers' | 'following';
  cursor?: string;
  limit?: number;
}

interface UserFriendsApiParams {
  userId: number;
  cursor?: string;
  limit?: number;
}

interface UsersApiParams {
  clubName: string;
  unauthClubs: string[];
  name?: string;
  includeTopPosts?: boolean;
  location: 'city' | 'global';
  cursor?: string;
  limit?: number;
}

interface UserViewApiParams {
  userId: number;
}

interface VerifyResetPasswordApiParams {
  userId: number;
  token: string;
  password: string;
}

interface BatchedApiData {
  results: (
    | {
        _name?: string;
        data: JsonObj | null;
      }
    | {
        _name?: string;
        status: number;
        error: JsonObj;
      }
  )[];
}

interface ChatsApiData {
  entityIds: number[];
  cursor?: string;
  hasCompleted: boolean;
}

interface CheckEntityExistsApiData {
  exists: boolean;
}

interface CityApiData {
  cityId: number;
}

interface ClubsApiData {
  entityIds: number[];
  cursor?: string;
  hasCompleted: boolean;
}

interface ClubViewApiData {
  numMembersInCity: number;
  siblingClubIds: number[];
  childClubIds: number[];
  clubDepth?: number;
}

interface CreateChatApiData {
  chatId?: number;
}

interface CreateClubApiData {
  name: string;
}

interface CreatePostApiData {
  postId?: number;
}

interface CreateRoomApiData {
  roomId?: number;
}

interface CurrentUserApiData {
  currentUserId: number;
  clubIds?: number[];
}

interface ExistingChatWithUserApiData {
  chatId: number | null;
}

interface FavoriteClubsApiData {
  topClubs: {
    id: number;
    globalReplies: number;
    cityReplies: number;
  }[];
  type: 'favorite' | 'top';
}

interface LoginUserApiData {
  currentUserId: number;
  authToken: string;
}

interface NotifsApiData {
  entityIds: number[];
  cursor?: string;
  hasCompleted: boolean;
}

interface OnboardCompleteProfileApiData {
  items: {
    title: string;
    desc: string;
    path: string;
  }[];
}

interface PostReplyThreadsApiData {
  entityIds: number[];
  cursor?: string;
  hasCompleted: boolean;
}

interface PostsApiData {
  entityIds: number[];
  cursor?: string;
  hasCompleted: boolean;
}

interface RandomUsersApiData {
  userIds: number[];
}

interface RegisterUserApiData {
  currentUserId: number;
  authToken: string;
}

interface RelatedUsersApiData {
  entityIds: number[];
  cursor?: string;
  hasCompleted: boolean;
}

interface RepliesApiData {
  entityIds: (number | string)[];
  cursor?: string;
  hasCompleted: boolean;
}

interface RoomsApiData {
  clubIds?: number[];
  entityIds?: number[];
  cursor?: string;
  hasCompleted?: boolean;
}

interface SearchCitiesApiData {
  cityIds: number[];
}

interface SseOtpApiData {
  otp: string | null;
}

interface TopLevelClubsApiData {
  clubIds: number[];
}

interface TopPostRepliesApiData {
  topReplyIds?: number[];
}

interface TopUsersApiData {
  entityIds: number[];
  cursor?: string;
  hasCompleted: boolean;
}

interface UnreadChatsCountApiData {
  count: number;
}

interface UnseenNotifIdsApiData {
  notifIds: ObjectOf<number[]>;
}

interface UpdateAccountSettingsApiData {

}

interface UserClubsWithPostsApiData {
  entityIds: number[];
  cursor?: string;
  hasCompleted: boolean;
}

interface UserFollowsApiData {
  entityIds: number[];
  cursor?: string;
  hasCompleted: boolean;
}

interface UserFriendsApiData {
  entityIds: number[];
  cursor?: string;
  hasCompleted: boolean;
}

interface UsersApiData {
  entityIds: number[];
  cursor?: string;
  hasCompleted: boolean;
}

interface VerifyResetPasswordApiData {
  currentUserId: number;
  authToken: string;
}

type ApiNameToParams = {
  'batched': BatchedApiParams,
  'blockUser': BlockUserApiParams,
  'chat': ChatApiParams,
  'chats': ChatsApiParams,
  'checkEntityExists': CheckEntityExistsApiParams,
  'city': CityApiParams,
  'club': ClubApiParams,
  'clubs': ClubsApiParams,
  'clubView': ClubViewApiParams,
  'createChat': CreateChatApiParams,
  'createClub': CreateClubApiParams,
  'createPost': CreatePostApiParams,
  'createReaction': CreateReactionApiParams,
  'createReply': CreateReplyApiParams,
  'createReport': CreateReportApiParams,
  'createRoom': CreateRoomApiParams,
  'currentUser': CurrentUserApiParams,
  'deletePost': DeletePostApiParams,
  'deleteReaction': DeleteReactionApiParams,
  'deleteReply': DeleteReplyApiParams,
  'existingChatWithUser': ExistingChatWithUserApiParams,
  'favoriteClubs': FavoriteClubsApiParams,
  'followUser': FollowUserApiParams,
  'joinClubs': JoinClubsApiParams,
  'leaveClub': LeaveClubApiParams,
  'loginUser': LoginUserApiParams,
  'notifs': NotifsApiParams,
  'onboardCompleteProfile': OnboardCompleteProfileApiParams,
  'post': PostApiParams,
  'postReplyThreads': PostReplyThreadsApiParams,
  'posts': PostsApiParams,
  'randomUsers': RandomUsersApiParams,
  'readChat': ReadChatApiParams,
  'readNotif': ReadNotifApiParams,
  'registerUser': RegisterUserApiParams,
  'relatedUsers': RelatedUsersApiParams,
  'replies': RepliesApiParams,
  'reply': ReplyApiParams,
  'resetPassword': ResetPasswordApiParams,
  'room': RoomApiParams,
  'rooms': RoomsApiParams,
  'searchCities': SearchCitiesApiParams,
  'seenNotifs': SeenNotifsApiParams,
  'sseOtp': SseOtpApiParams,
  'sseSubscribe': SseSubscribeApiParams,
  'sseUnsubscribe': SseUnsubscribeApiParams,
  'topLevelClubs': TopLevelClubsApiParams,
  'topPostReplies': TopPostRepliesApiParams,
  'topUsers': TopUsersApiParams,
  'unblockUser': UnblockUserApiParams,
  'unfollowUser': UnfollowUserApiParams,
  'unreadChatsCount': UnreadChatsCountApiParams,
  'unseenNotifIds': UnseenNotifIdsApiParams,
  'updateAccountSettings': UpdateAccountSettingsApiParams,
  'updateCurrentUser': UpdateCurrentUserApiParams,
  'updateUserCity': UpdateUserCityApiParams,
  'user': UserApiParams,
  'userClubsWithPosts': UserClubsWithPostsApiParams,
  'userFollows': UserFollowsApiParams,
  'userFriends': UserFriendsApiParams,
  'users': UsersApiParams,
  'userView': UserViewApiParams,
  'verifyResetPassword': VerifyResetPasswordApiParams,
};

type ApiNameToData = {
  'batched': BatchedApiData,
  'blockUser': null,
  'chat': null,
  'chats': ChatsApiData,
  'checkEntityExists': CheckEntityExistsApiData,
  'city': CityApiData,
  'club': null,
  'clubs': ClubsApiData,
  'clubView': ClubViewApiData,
  'createChat': CreateChatApiData,
  'createClub': CreateClubApiData,
  'createPost': CreatePostApiData,
  'createReaction': null,
  'createReply': null,
  'createReport': null,
  'createRoom': CreateRoomApiData,
  'currentUser': CurrentUserApiData,
  'deletePost': null,
  'deleteReaction': null,
  'deleteReply': null,
  'existingChatWithUser': ExistingChatWithUserApiData,
  'favoriteClubs': FavoriteClubsApiData,
  'followUser': null,
  'joinClubs': null,
  'leaveClub': null,
  'loginUser': LoginUserApiData,
  'notifs': NotifsApiData,
  'onboardCompleteProfile': OnboardCompleteProfileApiData,
  'post': null,
  'postReplyThreads': PostReplyThreadsApiData,
  'posts': PostsApiData,
  'randomUsers': RandomUsersApiData,
  'readChat': null,
  'readNotif': null,
  'registerUser': RegisterUserApiData,
  'relatedUsers': RelatedUsersApiData,
  'replies': RepliesApiData,
  'reply': null,
  'resetPassword': null,
  'room': null,
  'rooms': RoomsApiData,
  'searchCities': SearchCitiesApiData,
  'seenNotifs': null,
  'sseOtp': SseOtpApiData,
  'sseSubscribe': null,
  'sseUnsubscribe': null,
  'topLevelClubs': TopLevelClubsApiData,
  'topPostReplies': TopPostRepliesApiData,
  'topUsers': TopUsersApiData,
  'unblockUser': null,
  'unfollowUser': null,
  'unreadChatsCount': UnreadChatsCountApiData,
  'unseenNotifIds': UnseenNotifIdsApiData,
  'updateAccountSettings': UpdateAccountSettingsApiData,
  'updateCurrentUser': null,
  'updateUserCity': null,
  'user': null,
  'userClubsWithPosts': UserClubsWithPostsApiData,
  'userFollows': UserFollowsApiData,
  'userFriends': UserFriendsApiData,
  'users': UsersApiData,
  'userView': null,
  'verifyResetPassword': VerifyResetPasswordApiData,
};

type ApiName = 'batched'
  | 'blockUser'
  | 'chat'
  | 'chats'
  | 'checkEntityExists'
  | 'city'
  | 'club'
  | 'clubs'
  | 'clubView'
  | 'createChat'
  | 'createClub'
  | 'createPost'
  | 'createReaction'
  | 'createReply'
  | 'createReport'
  | 'createRoom'
  | 'currentUser'
  | 'deletePost'
  | 'deleteReaction'
  | 'deleteReply'
  | 'existingChatWithUser'
  | 'favoriteClubs'
  | 'followUser'
  | 'joinClubs'
  | 'leaveClub'
  | 'loginUser'
  | 'notifs'
  | 'onboardCompleteProfile'
  | 'post'
  | 'postReplyThreads'
  | 'posts'
  | 'randomUsers'
  | 'readChat'
  | 'readNotif'
  | 'registerUser'
  | 'relatedUsers'
  | 'replies'
  | 'reply'
  | 'resetPassword'
  | 'room'
  | 'rooms'
  | 'searchCities'
  | 'seenNotifs'
  | 'sseOtp'
  | 'sseSubscribe'
  | 'sseUnsubscribe'
  | 'topLevelClubs'
  | 'topPostReplies'
  | 'topUsers'
  | 'unblockUser'
  | 'unfollowUser'
  | 'unreadChatsCount'
  | 'unseenNotifIds'
  | 'updateAccountSettings'
  | 'updateCurrentUser'
  | 'updateUserCity'
  | 'user'
  | 'userClubsWithPosts'
  | 'userFollows'
  | 'userFriends'
  | 'users'
  | 'userView'
  | 'verifyResetPassword';

type AuthApiName = 'blockUser'
| 'chat'
| 'chats'
| 'createChat'
| 'createClub'
| 'createPost'
| 'createReaction'
| 'createReply'
| 'createReport'
| 'createRoom'
| 'currentUser'
| 'deletePost'
| 'deleteReaction'
| 'deleteReply'
| 'existingChatWithUser'
| 'followUser'
| 'joinClubs'
| 'leaveClub'
| 'notifs'
| 'postReplyThreads'
| 'readChat'
| 'readNotif'
| 'seenNotifs'
| 'unblockUser'
| 'unfollowUser'
| 'unreadChatsCount'
| 'unseenNotifIds'
| 'updateAccountSettings'
| 'updateCurrentUser'
| 'updateUserCity';