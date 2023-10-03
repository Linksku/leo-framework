interface AddMeetupPollOptionApiParams {
  pollId: number;
  option: string;
}

interface ApproveMeetupResponseApiParams {
  meetupResponseId: number;
  approved: boolean;
}

interface BatchedApiParams {
  apis: {
    name: string;
    params: JsonObj;
  }[];
}

interface BlockClubApiParams {
  clubId: number;
}

interface BlockUserApiParams {
  blockeeId: number;
}

interface ChatApiParams {
  chatId: number;
}

interface ChatsApiParams {
  accepted: boolean;
  limit?: number;
  cursor?: string;
}

interface CheckEntityExistsApiParams {
  entityType: string;
  entityPartial: ObjectOf<string | number | null>;
}

interface CityApiParams {
  lat: number;
  lng: number;
}

interface ClubApiParams {
  id?: number;
  name?: string;
}

interface ClubInviteApiParams {
  token: string;
}

interface ClubsApiParams {
  parentClubId?: number | null;
  parentClubName?: string | null;
  siblingClubId?: number | null;
  search?: string;
  joinType?: 'joinedFirst' | 'onlyJoined';
  showAdult?: boolean;
  minMembers?: number;
  limit?: number;
  cursor?: string;
}

interface ClubsByNameApiParams {
  names: string[];
}

interface ClubViewApiParams {
  clubId?: number;
  clubName?: string;
}

interface CreateChatApiParams {
  recipientIds: number[];
  content: string;
}

interface CreateClubApiParams {
  id?: number;
  parentClubName: string;
  name: string;
  description?: string | null;
}

interface CreateClubInviteApiParams {
  clubId: number;
}

interface CreateMeetupPollApiParams {
  meetupId: number;
  title: string;
  options: string[];
}

interface CreateMeetupResponseApiParams {
  meetupId: number;
  status: 'going' | 'interested' | 'notGoing';
  inviteToken: string | null;
}

interface CreateOrEditMeetupApiParams {
  editMeetupId?: number;
  clubName: string;
  startTime: number;
  endTime?: number;
  timeTbd?: boolean;
  title: string;
  coverPhoto?: Express.Multer.File;
  coverPhotoCrop?: {
    top: number;
    left: number;
    right: number;
    bot: number;
  };
  clearCoverPhoto?: boolean;
  isOnline?: boolean;
  locationName?: string;
  attendanceInstructions?: string | null;
  link?: string;
  description?: string | null;
  maxCapacity?: number;
  friendsOnly?: boolean;
  responseApproval: 'none' | 'always' | 'nonFollowees';
  minAge?: number;
  maxAge?: number;
}

interface CreatePostApiParams {
  clubName: string;
  content?: string | null;
  media?: Express.Multer.File;
  mediaCrop?: {
    top: number;
    left: number;
    right: number;
    bot: number;
  };
  location?: 'city' | 'global';
  isAdult?: boolean;
}

interface CreateReactionApiParams {
  entityType: 'postReply' | 'roomReply' | 'chatReply' | 'meetupReply' | 'post';
  entityId: number;
  reactType: string;
}

interface CreateReplyApiParams {
  replyType: 'postReply' | 'roomReply' | 'chatReply' | 'meetupReply';
  parentEntityId?: number;
  parentReplyId?: number;
  content: string;
  meetupInviteToken?: string | null;
}

interface CreateReportApiParams {
  entityType: 'club' | 'meetupReply' | 'post' | 'postReply' | 'roomReply' | 'user';
  entityId: number;
}

interface CreateRoomApiParams {
  clubId: number;
  cityId: number | null;
}

interface CurrentUserApiParams {

}

interface CurrentUserClubMembershipsApiParams {
  limit?: number;
  cursor?: string;
}

interface DeleteMeetupApiParams {
  meetupId: number;
}

interface DeletePostApiParams {
  postId: number;
}

interface DeleteReactionApiParams {
  entityType: 'postReply' | 'roomReply' | 'chatReply' | 'meetupReply' | 'post';
  entityId: number;
}

interface DeleteReplyApiParams {
  replyType: 'postReply' | 'roomReply' | 'chatReply' | 'meetupReply';
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

interface JoinClubApiParams {
  clubId: number;
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

interface MeetupApiParams {
  meetupId: number;
  inviteToken: string | null;
}

interface MeetupMessageAllApiParams {
  meetupId: number;
  content: string;
}

interface MeetupPollsApiParams {
  meetupId: number;
  inviteToken?: string | null;
}

interface MeetupResponsesApiParams {
  meetupId: number;
  status: 'going' | 'interested' | 'notGoing' | 'unapproved';
  inviteToken: string | null;
  limit?: number;
  cursor?: string;
}

interface MeetupsApiParams {
  clubName: string;
  unauthClubs?: string[];
  attendingType?: 'hosting' | 'attending' | 'notAttending';
  followingType?: 'following' | 'notFollowing' | 'friends';
  location?: 'city' | 'online';
  afterTime?: number;
  beforeTime?: number;
  limit?: number;
  cursor?: string;
}

interface MyClubsRoomsViewApiParams {
  unauthClubs: string[];
}

interface NotifsApiParams {
  scope: 'general' | 'chat' | 'chatRequest';
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
  onlyFollowing?: boolean;
  unauthClubs: string[];
  location: 'city' | 'global' | 'globalOnly';
  authorId?: number;
  includeLowQuality?: boolean;
  limit?: number;
  sort?: 'hot' | 'lastReply' | 'new';
  cursor?: string;
}

interface RandomUsersApiParams {
  unauthClubs: string[];
  location?: 'city' | 'global';
  ctxUserId?: number;
  limit?: number;
}

interface ReactionCountsApiParams {
  entityType: 'postReply' | 'roomReply' | 'chatReply' | 'meetupReply' | 'post';
  entityId: number;
}

interface ReactionsApiParams {
  entityType: 'postReply' | 'roomReply' | 'chatReply' | 'meetupReply' | 'post';
  entityId: number;
  reactType?: string;
  cursor?: string;
  limit?: number;
}

interface ReadChatApiParams {
  chatId: number;
}

interface ReadNotifApiParams {
  notifId: number;
}

interface RecentFollowingPostsApiParams {
  minPosts: number;
  sort?: 'hot' | 'lastReply' | 'new';
  limit?: number;
  cursor?: string;
}

interface RegenerateMeetupInviteTokenApiParams {
  meetupId: number;
}

interface RegisterPushNotifTokenApiParams {
  platform: 'web' | 'android' | 'ios';
  deviceId: string;
  registrationToken: string;
}

interface RegisterUserApiParams {
  email: string;
  password: string;
  name: string;
  birthday: string;
}

interface RelatedUsersApiParams {
  unauthClubs: string[];
  location: 'city' | 'global' | 'globalOnly';
  lowQualityUsers?: boolean;
  excludeFollowing?: boolean;
  isOnboarding?: boolean;
  cursor?: string;
  limit?: number;
}

interface RepliesApiParams {
  replyType: 'postReply' | 'roomReply' | 'chatReply' | 'meetupReply';
  parentEntityId?: number;
  parentReplyId?: number;
  oldestFirst?: boolean;
  initialId?: number;
  meetupInviteToken?: string | null;
  limit?: number;
  cursor?: string;
}

interface ReplyApiParams {
  replyType: 'postReply' | 'roomReply' | 'chatReply' | 'meetupReply';
  replyId: number;
  meetupInviteToken?: string | null;
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
  cityId: number | null;
  subclubs?: boolean;
  limit?: number;
  cursor?: string;
}

interface RoomsInClubApiParams {
  clubName: string;
}

interface SearchCitiesApiParams {
  name: string;
  lat?: number;
  lng?: number;
  limit?: number;
}

interface SeenNotifsApiParams {
  scope: 'general' | 'chat' | 'chatRequest';
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

interface StatusApiParams {

}

interface ToggleMeetupPollResponseApiParams {
  pollId: number;
  optionId: number;
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

interface UnblockClubApiParams {
  clubId: number;
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

interface UpdateClubPrivacyApiParams {
  clubId: number;
  privacy: 'public' | 'mutual' | 'private';
}

interface UpdateCurrentUserApiParams {
  name: string;
  birthday: string;
  cityId?: number | null;
  school?: string | null;
  jobTitle?: string | null;
  jobCompany?: string | null;
  tagline?: string | null;
  bio?: string | null;
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
  followingType?: 'onlyFollowing' | 'onlyFollowers' | 'excludeFollowing' | 'followingFirst' | 'followersFirst';
  unauthClubs: string[];
  name?: string;
  location?: 'city' | 'global' | 'globalOnly';
  excludeFollowing?: boolean;
  includeTopPosts?: boolean;
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
        batchIdx: number;
        data: {
          [k: string]: any;
        };
      }
    | {
        _name?: string;
        batchIdx: number;
        status: number;
        error: {
          msg: string;
          stack?: string[];
          debugCtx?: {
            [k: string]: any;
          };
        };
      }
  )[];
}

interface ChatsApiData {
  items: number[];
  cursor?: string;
  hasCompleted: boolean;
}

interface CheckEntityExistsApiData {
  exists: boolean;
}

interface CityApiData {
  cityId: number;
}

interface ClubInviteApiData {
  clubId: number;
  inviterId: number;
  numMembersInCity: number;
}

interface ClubsApiData {
  items: number[];
  cursor?: string;
  hasCompleted: boolean;
}

interface ClubsByNameApiData {
  entityIds: number[];
}

interface ClubViewApiData {
  numMembersInCity: number;
  siblingClubIds: number[];
  subClubIds: number[];
  clubDepth?: number;
}

interface CreateChatApiData {
  chatId?: number;
}

interface CreateClubApiData {
  name: string;
}

interface CreateClubInviteApiData {
  clubInviteToken: string;
}

interface CreateOrEditMeetupApiData {
  meetupId?: number;
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

interface CurrentUserClubMembershipsApiData {
  items: number[];
  cursor?: string;
  hasCompleted: boolean;
}

interface ExistingChatWithUserApiData {
  chatId: number | null;
}

interface FavoriteClubsApiData {
  topClubIds: number[];
  type: 'favorite' | 'top';
}

interface LoginUserApiData {
  currentUserId: number;
  authToken: string;
}

interface MeetupResponsesApiData {
  items: number[];
  cursor?: string;
  hasCompleted: boolean;
}

interface MeetupsApiData {
  items: number[];
  cursor?: string;
  hasCompleted: boolean;
}

interface MyClubsRoomsViewApiData {
  cityRooms: string[];
  cityHasCompleted?: boolean;
  globalRooms: string[];
  globalHasCompleted?: boolean;
  subclubsRooms: string[];
  subclubsHasCompleted?: boolean;
}

interface NotifsApiData {
  items: number[];
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
  items: number[];
  cursor?: string;
  hasCompleted: boolean;
}

interface PostsApiData {
  items: number[];
  cursor?: string;
  hasCompleted: boolean;
}

interface RandomUsersApiData {
  userIds: number[];
}

interface ReactionsApiData {
  items: number[];
  cursor?: string;
  hasCompleted: boolean;
}

interface RecentFollowingPostsApiData {
  items: number[];
  cursor?: string;
  hasCompleted: boolean;
}

interface RegisterUserApiData {
  currentUserId: number;
  authToken: string;
}

interface RelatedUsersApiData {
  items: number[];
  cursor?: string;
  hasCompleted: boolean;
}

interface RepliesApiData {
  items: number[];
  cursor?: string;
  hasCompleted: boolean;
}

interface RoomsApiData {
  items: (number | string)[];
  cursor?: string;
  hasCompleted: boolean;
}

interface SearchCitiesApiData {
  cityIds: number[];
}

interface SseOtpApiData {
  otp: string | null;
}

interface StatusApiData {
  serverId: number;
  failingHealthchecks: string[];
  isInitInfra?: boolean;
}

interface ToggleMeetupPollResponseApiData {
  type?: 'create' | 'delete';
}

interface TopLevelClubsApiData {
  items: number[];
  cursor?: string;
  hasCompleted: boolean;
}

interface TopPostRepliesApiData {
  topReplyIds?: number[];
}

interface TopUsersApiData {
  items: number[];
  cursor?: string;
  hasCompleted: boolean;
}

interface UnreadChatsCountApiData {
  count: number;
}

interface UnseenNotifIdsApiData {
  notifIds: Partial<Record<'general' | 'chat' | 'chatRequest', number[]>>;
}

interface UpdateAccountSettingsApiData {

}

interface UserClubsWithPostsApiData {
  items: number[];
  cursor?: string;
  hasCompleted: boolean;
}

interface UserFollowsApiData {
  items: number[];
  cursor?: string;
  hasCompleted: boolean;
}

interface UserFriendsApiData {
  items: number[];
  cursor?: string;
  hasCompleted: boolean;
}

interface UsersApiData {
  items: number[];
  cursor?: string;
  hasCompleted: boolean;
}

interface VerifyResetPasswordApiData {
  currentUserId: number;
  authToken: string;
}

type ApiNameToParams = {
  'addMeetupPollOption': AddMeetupPollOptionApiParams,
  'approveMeetupResponse': ApproveMeetupResponseApiParams,
  'batched': BatchedApiParams,
  'blockClub': BlockClubApiParams,
  'blockUser': BlockUserApiParams,
  'chat': ChatApiParams,
  'chats': ChatsApiParams,
  'checkEntityExists': CheckEntityExistsApiParams,
  'city': CityApiParams,
  'club': ClubApiParams,
  'clubInvite': ClubInviteApiParams,
  'clubs': ClubsApiParams,
  'clubsByName': ClubsByNameApiParams,
  'clubView': ClubViewApiParams,
  'createChat': CreateChatApiParams,
  'createClub': CreateClubApiParams,
  'createClubInvite': CreateClubInviteApiParams,
  'createMeetupPoll': CreateMeetupPollApiParams,
  'createMeetupResponse': CreateMeetupResponseApiParams,
  'createOrEditMeetup': CreateOrEditMeetupApiParams,
  'createPost': CreatePostApiParams,
  'createReaction': CreateReactionApiParams,
  'createReply': CreateReplyApiParams,
  'createReport': CreateReportApiParams,
  'createRoom': CreateRoomApiParams,
  'currentUser': CurrentUserApiParams,
  'currentUserClubMemberships': CurrentUserClubMembershipsApiParams,
  'deleteMeetup': DeleteMeetupApiParams,
  'deletePost': DeletePostApiParams,
  'deleteReaction': DeleteReactionApiParams,
  'deleteReply': DeleteReplyApiParams,
  'existingChatWithUser': ExistingChatWithUserApiParams,
  'favoriteClubs': FavoriteClubsApiParams,
  'followUser': FollowUserApiParams,
  'joinClub': JoinClubApiParams,
  'joinClubs': JoinClubsApiParams,
  'leaveClub': LeaveClubApiParams,
  'loginUser': LoginUserApiParams,
  'meetup': MeetupApiParams,
  'meetupMessageAll': MeetupMessageAllApiParams,
  'meetupPolls': MeetupPollsApiParams,
  'meetupResponses': MeetupResponsesApiParams,
  'meetups': MeetupsApiParams,
  'myClubsRoomsView': MyClubsRoomsViewApiParams,
  'notifs': NotifsApiParams,
  'onboardCompleteProfile': OnboardCompleteProfileApiParams,
  'post': PostApiParams,
  'postReplyThreads': PostReplyThreadsApiParams,
  'posts': PostsApiParams,
  'randomUsers': RandomUsersApiParams,
  'reactionCounts': ReactionCountsApiParams,
  'reactions': ReactionsApiParams,
  'readChat': ReadChatApiParams,
  'readNotif': ReadNotifApiParams,
  'recentFollowingPosts': RecentFollowingPostsApiParams,
  'regenerateMeetupInviteToken': RegenerateMeetupInviteTokenApiParams,
  'registerPushNotifToken': RegisterPushNotifTokenApiParams,
  'registerUser': RegisterUserApiParams,
  'relatedUsers': RelatedUsersApiParams,
  'replies': RepliesApiParams,
  'reply': ReplyApiParams,
  'resetPassword': ResetPasswordApiParams,
  'room': RoomApiParams,
  'rooms': RoomsApiParams,
  'roomsInClub': RoomsInClubApiParams,
  'searchCities': SearchCitiesApiParams,
  'seenNotifs': SeenNotifsApiParams,
  'sseOtp': SseOtpApiParams,
  'sseSubscribe': SseSubscribeApiParams,
  'sseUnsubscribe': SseUnsubscribeApiParams,
  'status': StatusApiParams,
  'toggleMeetupPollResponse': ToggleMeetupPollResponseApiParams,
  'topLevelClubs': TopLevelClubsApiParams,
  'topPostReplies': TopPostRepliesApiParams,
  'topUsers': TopUsersApiParams,
  'unblockClub': UnblockClubApiParams,
  'unblockUser': UnblockUserApiParams,
  'unfollowUser': UnfollowUserApiParams,
  'unreadChatsCount': UnreadChatsCountApiParams,
  'unseenNotifIds': UnseenNotifIdsApiParams,
  'updateAccountSettings': UpdateAccountSettingsApiParams,
  'updateClubPrivacy': UpdateClubPrivacyApiParams,
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
  'addMeetupPollOption': null,
  'approveMeetupResponse': null,
  'batched': BatchedApiData,
  'blockClub': null,
  'blockUser': null,
  'chat': null,
  'chats': ChatsApiData,
  'checkEntityExists': CheckEntityExistsApiData,
  'city': CityApiData,
  'club': null,
  'clubInvite': ClubInviteApiData,
  'clubs': ClubsApiData,
  'clubsByName': ClubsByNameApiData,
  'clubView': ClubViewApiData,
  'createChat': CreateChatApiData,
  'createClub': CreateClubApiData,
  'createClubInvite': CreateClubInviteApiData,
  'createMeetupPoll': null,
  'createMeetupResponse': null,
  'createOrEditMeetup': CreateOrEditMeetupApiData,
  'createPost': CreatePostApiData,
  'createReaction': null,
  'createReply': null,
  'createReport': null,
  'createRoom': CreateRoomApiData,
  'currentUser': CurrentUserApiData,
  'currentUserClubMemberships': CurrentUserClubMembershipsApiData,
  'deleteMeetup': null,
  'deletePost': null,
  'deleteReaction': null,
  'deleteReply': null,
  'existingChatWithUser': ExistingChatWithUserApiData,
  'favoriteClubs': FavoriteClubsApiData,
  'followUser': null,
  'joinClub': null,
  'joinClubs': null,
  'leaveClub': null,
  'loginUser': LoginUserApiData,
  'meetup': null,
  'meetupMessageAll': null,
  'meetupPolls': null,
  'meetupResponses': MeetupResponsesApiData,
  'meetups': MeetupsApiData,
  'myClubsRoomsView': MyClubsRoomsViewApiData,
  'notifs': NotifsApiData,
  'onboardCompleteProfile': OnboardCompleteProfileApiData,
  'post': null,
  'postReplyThreads': PostReplyThreadsApiData,
  'posts': PostsApiData,
  'randomUsers': RandomUsersApiData,
  'reactionCounts': null,
  'reactions': ReactionsApiData,
  'readChat': null,
  'readNotif': null,
  'recentFollowingPosts': RecentFollowingPostsApiData,
  'regenerateMeetupInviteToken': null,
  'registerPushNotifToken': null,
  'registerUser': RegisterUserApiData,
  'relatedUsers': RelatedUsersApiData,
  'replies': RepliesApiData,
  'reply': null,
  'resetPassword': null,
  'room': null,
  'rooms': RoomsApiData,
  'roomsInClub': null,
  'searchCities': SearchCitiesApiData,
  'seenNotifs': null,
  'sseOtp': SseOtpApiData,
  'sseSubscribe': null,
  'sseUnsubscribe': null,
  'status': StatusApiData,
  'toggleMeetupPollResponse': ToggleMeetupPollResponseApiData,
  'topLevelClubs': TopLevelClubsApiData,
  'topPostReplies': TopPostRepliesApiData,
  'topUsers': TopUsersApiData,
  'unblockClub': null,
  'unblockUser': null,
  'unfollowUser': null,
  'unreadChatsCount': UnreadChatsCountApiData,
  'unseenNotifIds': UnseenNotifIdsApiData,
  'updateAccountSettings': UpdateAccountSettingsApiData,
  'updateClubPrivacy': null,
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

type ApiName = 'addMeetupPollOption'
  | 'approveMeetupResponse'
  | 'batched'
  | 'blockClub'
  | 'blockUser'
  | 'chat'
  | 'chats'
  | 'checkEntityExists'
  | 'city'
  | 'club'
  | 'clubInvite'
  | 'clubs'
  | 'clubsByName'
  | 'clubView'
  | 'createChat'
  | 'createClub'
  | 'createClubInvite'
  | 'createMeetupPoll'
  | 'createMeetupResponse'
  | 'createOrEditMeetup'
  | 'createPost'
  | 'createReaction'
  | 'createReply'
  | 'createReport'
  | 'createRoom'
  | 'currentUser'
  | 'currentUserClubMemberships'
  | 'deleteMeetup'
  | 'deletePost'
  | 'deleteReaction'
  | 'deleteReply'
  | 'existingChatWithUser'
  | 'favoriteClubs'
  | 'followUser'
  | 'joinClub'
  | 'joinClubs'
  | 'leaveClub'
  | 'loginUser'
  | 'meetup'
  | 'meetupMessageAll'
  | 'meetupPolls'
  | 'meetupResponses'
  | 'meetups'
  | 'myClubsRoomsView'
  | 'notifs'
  | 'onboardCompleteProfile'
  | 'post'
  | 'postReplyThreads'
  | 'posts'
  | 'randomUsers'
  | 'reactionCounts'
  | 'reactions'
  | 'readChat'
  | 'readNotif'
  | 'recentFollowingPosts'
  | 'regenerateMeetupInviteToken'
  | 'registerPushNotifToken'
  | 'registerUser'
  | 'relatedUsers'
  | 'replies'
  | 'reply'
  | 'resetPassword'
  | 'room'
  | 'rooms'
  | 'roomsInClub'
  | 'searchCities'
  | 'seenNotifs'
  | 'sseOtp'
  | 'sseSubscribe'
  | 'sseUnsubscribe'
  | 'status'
  | 'toggleMeetupPollResponse'
  | 'topLevelClubs'
  | 'topPostReplies'
  | 'topUsers'
  | 'unblockClub'
  | 'unblockUser'
  | 'unfollowUser'
  | 'unreadChatsCount'
  | 'unseenNotifIds'
  | 'updateAccountSettings'
  | 'updateClubPrivacy'
  | 'updateCurrentUser'
  | 'updateUserCity'
  | 'user'
  | 'userClubsWithPosts'
  | 'userFollows'
  | 'userFriends'
  | 'users'
  | 'userView'
  | 'verifyResetPassword';

type AuthApiName = 'addMeetupPollOption'
| 'approveMeetupResponse'
| 'blockClub'
| 'blockUser'
| 'chat'
| 'chats'
| 'createChat'
| 'createClub'
| 'createClubInvite'
| 'createMeetupPoll'
| 'createMeetupResponse'
| 'createOrEditMeetup'
| 'createPost'
| 'createReaction'
| 'createReply'
| 'createReport'
| 'createRoom'
| 'currentUser'
| 'currentUserClubMemberships'
| 'deleteMeetup'
| 'deletePost'
| 'deleteReaction'
| 'deleteReply'
| 'existingChatWithUser'
| 'followUser'
| 'joinClub'
| 'joinClubs'
| 'leaveClub'
| 'meetupMessageAll'
| 'notifs'
| 'postReplyThreads'
| 'reactionCounts'
| 'reactions'
| 'readChat'
| 'readNotif'
| 'regenerateMeetupInviteToken'
| 'registerPushNotifToken'
| 'seenNotifs'
| 'toggleMeetupPollResponse'
| 'unblockClub'
| 'unblockUser'
| 'unfollowUser'
| 'unreadChatsCount'
| 'unseenNotifIds'
| 'updateAccountSettings'
| 'updateClubPrivacy'
| 'updateCurrentUser'
| 'updateUserCity';
