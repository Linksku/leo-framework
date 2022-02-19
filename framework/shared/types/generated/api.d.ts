interface RegisterUserParams {
  email: string;
  password: string;
  name: string;
  birthday: string;
}

interface LoginUserParams {
  email: string;
  password: string;
}

interface ResetPasswordParams {
  email: string;
}

interface VerifyResetPasswordParams {
  userId: number;
  token: string;
  password: string;
}

interface BatchedParams {
  apis: {
    name: string;
    params: Pojo;
  }[];
}

interface GetUnseenNotifIdsParams {

}

interface GetNotifsParams {
  limit?: number;
  cursor?: string;
}

interface SeenNotifsParams {
  notifType: 'notifs' | 'chats';
}

interface ReadNotifParams {
  notifId: number;
}

interface CreateReportParams {
  entityType: 'post';
  entityId: number;
}

interface SseOtpParams {

}

interface SseSubscribeParams {
  sessionId: string;
  events: {
    name: string;
    params: Pojo;
  }[];
}

interface SseUnsubscribeParams {
  sessionId: string;
  events: {
    name: string;
    params: Pojo;
  }[];
}

interface GetChatsParams {
  limit?: number;
  cursor?: string;
}

interface GetChatParams {
  chatId: number;
}

interface GetChatWithParticipantParams {
  userId: number;
}

interface CreateChatParams {
  recipientIds: number[];
  content: string;
}

interface GetUnreadChatsCountParams {

}

interface ReadChatParams {
  chatId: number;
}

interface GetCityParams {
  lat: number;
  lng: number;
}

interface SearchCitiesParams {
  name: string;
  lat?: number;
  lng?: number;
  limit?: number;
}

interface GetClubsParams {
  clubNames?: string[];
  search?: string;
  parentClubId?: number | null;
  onlyJoined?: boolean;
  includeParents?: boolean;
  excludeUserClubs?: boolean;
  showAdult?: boolean;
  limit?: number;
  cursor?: string;
}

interface GetTopLevelClubsParams {
  showAdult?: boolean;
  randomizeOrder?: boolean;
}

interface GetClubParams {
  id?: number;
  name?: string;
}

interface GetClubViewParams {
  clubName: string;
}

interface CreateClubParams {
  id?: number;
  parentClubName: string;
  name: string;
  description?: string;
}

interface JoinClubsParams {
  clubIds: number[];
}

interface LeaveClubParams {
  clubId: number;
}

interface GetFavoriteClubsParams {
  clubName: string;
}

interface UserClubsWithPostsParams {
  userId: number;
  cursor?: string;
  limit?: number;
}

interface GetUserFollowsParams {
  userId: number;
  followType: 'followers' | 'following';
  cursor?: string;
  limit?: number;
}

interface FollowUserParams {
  followeeId: number;
}

interface UnfollowUserParams {
  followeeId: number;
}

interface GetOnboardCompleteProfileParams {

}

interface GetPostsParams {
  clubNames: string[];
  location: 'city' | 'global';
  authorId?: number;
  limit?: number;
  sort?: 'hot' | 'lastReply' | 'new';
  cursor?: string;
}

interface GetPostParams {
  postId: number;
}

interface GetTopPostRepliesParams {
  postId: number;
  numReplies: number;
}

interface CreatePostParams {
  clubName: string;
  content?: string | null;
  media?: Express.Multer.File;
}

interface DeletePostParams {
  postId: number;
}

interface GetPostRepliesParams {
  limit?: number;
  cursor?: string;
}

interface CreateReactionParams {
  entityType: 'post' | 'postReply' | 'chatReply' | 'roomReply';
  entityId: number;
  reactType: string;
}

interface DeleteReactionParams {
  entityType: 'post' | 'postReply' | 'chatReply' | 'roomReply';
  entityId: number;
}

interface GetReplyParams {
  replyType: 'postReply' | 'roomReply' | 'chatReply';
  replyId: number;
}

interface GetRepliesParams {
  replyType: 'postReply' | 'roomReply' | 'chatReply';
  parentEntityId: number;
  parentReplyId?: number;
  initialId?: number;
  limit?: number;
  cursor?: string;
}

interface CreateReplyParams {
  replyType: 'postReply' | 'roomReply' | 'chatReply';
  parentEntityId: number;
  parentReplyId?: number;
  content: string;
}

interface DeleteReplyParams {
  replyType: 'postReply' | 'roomReply' | 'chatReply';
  replyId: number;
}

interface GetRoomParams {
  roomId: number;
}

interface GetRoomsParams {
  clubNames: string[];
  location: 'city' | 'global';
  limit?: number;
  cursor?: string;
}

interface CreateRoomParams {
  clubId: number;
  cityId: number | null;
}

interface BlockUserParams {
  blockeeId: number;
}

interface UnblockUserParams {
  blockeeId: number;
}

interface GetCurrentUserParams {

}

interface GetUserParams {
  userId: number;
}

interface GetUsersParams {
  clubNames: string[];
  name?: string;
  includeTopPosts?: boolean;
  cursor?: string;
  limit?: number;
}

interface GetUserViewParams {
  userId: number;
}

interface UpdateCurrentUserParams {
  name: string;
  birthday: string;
  cityId?: number | null;
  school?: string;
  jobTitle?: string;
  jobCompany?: string;
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

interface UpdateUserCityParams {
  cityId: number | null;
}

interface UpdateAccountSettingsParams {
  email?: string;
  newPassword?: string;
  currentPassword: string;
}

interface GetRandomUsersParams {

}

interface RegisterUserData {
  currentUserId: number;
  authToken: string;
}

interface LoginUserData {
  currentUserId: number;
  authToken: string;
}

interface VerifyResetPasswordData {
  currentUserId: number;
  authToken: string;
}

interface BatchedData {
  results: (
    | {
        data: null | Pojo;
      }
    | {
        status: number;
        error: Pojo;
      }
  )[];
}

interface GetUnseenNotifIdsData {
  notifIds: ObjectOf<number[]>;
}

interface GetNotifsData {
  entityIds: number[];
  cursor?: string;
  hasCompleted: boolean;
}

interface SseOtpData {
  otp: string | null;
}

interface GetChatsData {
  entityIds: number[];
  cursor?: string;
  hasCompleted: boolean;
}

interface GetChatWithParticipantData {
  chatId: number | null;
}

interface CreateChatData {
  chatId?: number;
}

interface GetUnreadChatsCountData {
  count: number;
}

interface GetCityData {
  cityId: number;
}

interface SearchCitiesData {
  cityIds: number[];
}

interface GetClubsData {
  entityIds: number[];
  cursor?: string;
  hasCompleted: boolean;
}

interface GetTopLevelClubsData {
  clubIds: number[];
}

interface GetClubViewData {
  numMembersInCity: number;
  siblingClubIds: number[];
  childClubIds: number[];
  clubDepth?: number;
}

interface CreateClubData {
  name?: string;
}

interface GetFavoriteClubsData {
  topClubs: {
    id: number;
    globalReplies: number;
    cityReplies: number;
  }[];
  type: 'favorite' | 'top';
}

interface UserClubsWithPostsData {
  entityIds: number[];
  cursor?: string;
  hasCompleted: boolean;
}

interface GetUserFollowsData {
  entityIds: number[];
  cursor?: string;
  hasCompleted: boolean;
}

interface GetOnboardCompleteProfileData {
  items: {
    title: string;
    desc: string;
    path: string;
  }[];
}

interface GetPostsData {
  entityIds: number[];
  cursor?: string;
  hasCompleted: boolean;
}

interface GetTopPostRepliesData {
  topReplyIds?: number[];
}

interface CreatePostData {
  postId?: number;
}

interface GetPostRepliesData {
  entityIds: number[];
  cursor?: string;
  hasCompleted: boolean;
}

interface GetRepliesData {
  entityIds: number[];
  cursor?: string;
  hasCompleted: boolean;
}

interface GetRoomsData {
  clubIds?: number[];
  entityIds?: number[];
  cursor?: string;
  hasCompleted?: boolean;
}

interface CreateRoomData {
  roomId?: number;
}

interface GetCurrentUserData {
  currentUserId: number;
  clubIds?: number[];
}

interface GetUsersData {
  entityIds: number[];
  cursor?: string;
  hasCompleted: boolean;
}

interface UpdateCurrentUserData {
  clubIdsOrder: number[];
}

interface UpdateAccountSettingsData {

}

interface GetRandomUsersData {
  userIds: number[];
}

type ApiNameToParams = {
  'registerUser': RegisterUserParams,
  'loginUser': LoginUserParams,
  'resetPassword': ResetPasswordParams,
  'verifyResetPassword': VerifyResetPasswordParams,
  'batched': BatchedParams,
  'unseenNotifIds': GetUnseenNotifIdsParams,
  'notifs': GetNotifsParams,
  'seenNotifs': SeenNotifsParams,
  'readNotif': ReadNotifParams,
  'report': CreateReportParams,
  'sseOtp': SseOtpParams,
  'sseSubscribe': SseSubscribeParams,
  'sseUnsubscribe': SseUnsubscribeParams,
  'chats': GetChatsParams,
  'chat': GetChatParams,
  'chatWithParticipant': GetChatWithParticipantParams,
  'createChat': CreateChatParams,
  'unreadChatsCount': GetUnreadChatsCountParams,
  'readChat': ReadChatParams,
  'city': GetCityParams,
  'searchCities': SearchCitiesParams,
  'clubs': GetClubsParams,
  'topLevelClubs': GetTopLevelClubsParams,
  'club': GetClubParams,
  'clubView': GetClubViewParams,
  'createClub': CreateClubParams,
  'joinClubs': JoinClubsParams,
  'leaveClub': LeaveClubParams,
  'favoriteClubs': GetFavoriteClubsParams,
  'userClubsWithPosts': UserClubsWithPostsParams,
  'userFollows': GetUserFollowsParams,
  'followUser': FollowUserParams,
  'unfollowUser': UnfollowUserParams,
  'onboardCompleteProfile': GetOnboardCompleteProfileParams,
  'posts': GetPostsParams,
  'post': GetPostParams,
  'topPostReplies': GetTopPostRepliesParams,
  'createPost': CreatePostParams,
  'deletePost': DeletePostParams,
  'postReplies': GetPostRepliesParams,
  'createReaction': CreateReactionParams,
  'deleteReaction': DeleteReactionParams,
  'reply': GetReplyParams,
  'replies': GetRepliesParams,
  'createReply': CreateReplyParams,
  'deleteReply': DeleteReplyParams,
  'room': GetRoomParams,
  'rooms': GetRoomsParams,
  'createRoom': CreateRoomParams,
  'blockUser': BlockUserParams,
  'unblockUser': UnblockUserParams,
  'currentUser': GetCurrentUserParams,
  'user': GetUserParams,
  'users': GetUsersParams,
  'userView': GetUserViewParams,
  'updateCurrentUser': UpdateCurrentUserParams,
  'updateUserCity': UpdateUserCityParams,
  'updateAccountSettings': UpdateAccountSettingsParams,
  'randomUsers': GetRandomUsersParams,
};

type ApiNameToData = {
  'registerUser': RegisterUserData,
  'loginUser': LoginUserData,
  'resetPassword': null,
  'verifyResetPassword': VerifyResetPasswordData,
  'batched': BatchedData,
  'unseenNotifIds': GetUnseenNotifIdsData,
  'notifs': GetNotifsData,
  'seenNotifs': null,
  'readNotif': null,
  'report': null,
  'sseOtp': SseOtpData,
  'sseSubscribe': null,
  'sseUnsubscribe': null,
  'chats': GetChatsData,
  'chat': null,
  'chatWithParticipant': GetChatWithParticipantData,
  'createChat': CreateChatData,
  'unreadChatsCount': GetUnreadChatsCountData,
  'readChat': null,
  'city': GetCityData,
  'searchCities': SearchCitiesData,
  'clubs': GetClubsData,
  'topLevelClubs': GetTopLevelClubsData,
  'club': null,
  'clubView': GetClubViewData,
  'createClub': CreateClubData,
  'joinClubs': null,
  'leaveClub': null,
  'favoriteClubs': GetFavoriteClubsData,
  'userClubsWithPosts': UserClubsWithPostsData,
  'userFollows': GetUserFollowsData,
  'followUser': null,
  'unfollowUser': null,
  'onboardCompleteProfile': GetOnboardCompleteProfileData,
  'posts': GetPostsData,
  'post': null,
  'topPostReplies': GetTopPostRepliesData,
  'createPost': CreatePostData,
  'deletePost': null,
  'postReplies': GetPostRepliesData,
  'createReaction': null,
  'deleteReaction': null,
  'reply': null,
  'replies': GetRepliesData,
  'createReply': null,
  'deleteReply': null,
  'room': null,
  'rooms': GetRoomsData,
  'createRoom': CreateRoomData,
  'blockUser': null,
  'unblockUser': null,
  'currentUser': GetCurrentUserData,
  'user': null,
  'users': GetUsersData,
  'userView': null,
  'updateCurrentUser': UpdateCurrentUserData,
  'updateUserCity': null,
  'updateAccountSettings': UpdateAccountSettingsData,
  'randomUsers': GetRandomUsersData,
};

type ApiName = 'registerUser'
  | 'loginUser'
  | 'resetPassword'
  | 'verifyResetPassword'
  | 'batched'
  | 'unseenNotifIds'
  | 'notifs'
  | 'seenNotifs'
  | 'readNotif'
  | 'report'
  | 'sseOtp'
  | 'sseSubscribe'
  | 'sseUnsubscribe'
  | 'chats'
  | 'chat'
  | 'chatWithParticipant'
  | 'createChat'
  | 'unreadChatsCount'
  | 'readChat'
  | 'city'
  | 'searchCities'
  | 'clubs'
  | 'topLevelClubs'
  | 'club'
  | 'clubView'
  | 'createClub'
  | 'joinClubs'
  | 'leaveClub'
  | 'favoriteClubs'
  | 'userClubsWithPosts'
  | 'userFollows'
  | 'followUser'
  | 'unfollowUser'
  | 'onboardCompleteProfile'
  | 'posts'
  | 'post'
  | 'topPostReplies'
  | 'createPost'
  | 'deletePost'
  | 'postReplies'
  | 'createReaction'
  | 'deleteReaction'
  | 'reply'
  | 'replies'
  | 'createReply'
  | 'deleteReply'
  | 'room'
  | 'rooms'
  | 'createRoom'
  | 'blockUser'
  | 'unblockUser'
  | 'currentUser'
  | 'user'
  | 'users'
  | 'userView'
  | 'updateCurrentUser'
  | 'updateUserCity'
  | 'updateAccountSettings'
  | 'randomUsers';

type AuthApiName = 'unseenNotifIds'
| 'notifs'
| 'seenNotifs'
| 'readNotif'
| 'report'
| 'chats'
| 'chat'
| 'chatWithParticipant'
| 'createChat'
| 'unreadChatsCount'
| 'readChat'
| 'createClub'
| 'joinClubs'
| 'leaveClub'
| 'followUser'
| 'unfollowUser'
| 'createPost'
| 'deletePost'
| 'postReplies'
| 'createReaction'
| 'deleteReaction'
| 'createReply'
| 'deleteReply'
| 'createRoom'
| 'blockUser'
| 'unblockUser'
| 'currentUser'
| 'updateCurrentUser'
| 'updateUserCity'
| 'updateAccountSettings';
