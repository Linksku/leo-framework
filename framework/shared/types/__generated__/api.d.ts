interface AccountStatusApiParams {

}

interface AddMeetupPollOptionApiParams {
  pollId: number;
  option: string;
}

interface AddUserToChatApiParams {
  chatId: number;
  userId: number;
}

interface AllUserClubsInfoApiParams {

}

interface AppleLoginUserApiParams {
  type: 'login' | 'register';
  name?: string;
  jwt: string;
}

interface ApproveMeetupResponseApiParams {
  meetupResponseId: number;
  approved: boolean;
  rejectReason?: string | null;
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
  ancestorClubId?: number | null;
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

interface CreateMeetupInvitesApiParams {
  meetupId: number;
  inviteToken?: string | null;
  inviteeIds: number[];
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
  fetchUpsells?: boolean;
}

interface CreateOrEditMeetupApiParams {
  editMeetupId?: number;
  cloneMeetupId?: number;
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
  minAttendees?: number;
  maxCapacity?: number;
  friendsOnly?: boolean;
  responseApproval: 'none' | 'always' | 'nonFollowees';
  minAge?: number;
  maxAge?: number;
  inviteAllFromCloned?: boolean;
}

interface CreateOrEditPostApiParams {
  editPostId?: number;
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
  entityType: 'club' | 'meetup' | 'meetupReply' | 'post' | 'postReply' | 'roomReply' | 'user';
  entityId: number;
}

interface CurrentUserApiParams {

}

interface CurrentUserClubMembershipsApiParams {
  limit?: number;
  cursor?: string;
}

interface DeleteAccountApiParams {
  currentPassword: string | null;
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

interface GoogleLoginUserApiParams {
  token: string;
  type: 'login' | 'register';
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

interface MeetupInvitableUsersApiParams {
  meetupId: number;
  inviteToken?: string | null;
  myMeetupId?: number | null;
  limit?: number;
  cursor?: string;
}

interface MeetupInvitesApiParams {
  meetupId: number;
  inviteToken?: string | null;
  limit?: number;
  cursor?: string;
}

interface MeetupMessageAllApiParams {
  meetupId: number;
  content: string;
}

interface MeetupPollResponsesApiParams {
  pollId: number;
  optionId: number;
  inviteToken?: string | null;
  limit?: number;
  cursor?: string;
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
  order?: 'time' | 'userScore';
  cursor?: string;
}

interface MeetupsApiParams {
  clubName: string;
  unauthClubs?: string[];
  connectionType?: 'hosting' | 'attending' | 'invited' | 'connected' | 'notConnected';
  followingType?: 'following' | 'notFollowing' | 'friends' | 'self';
  location?: 'city' | 'online';
  afterTime?: number;
  beforeTime?: number;
  limit?: number;
  cursor?: string;
}

interface MyClubsRoomsViewApiParams {
  unauthClubs: string[];
}

interface MyInvitableMeetupsApiParams {
  meetupId: number;
  limit?: number;
  cursor?: string;
}

interface NotifsApiParams {
  scope: NotifScope;
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
  subclubPosts?: boolean;
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
  platform:
    | 'desktop-web'
    | 'android-web'
    | 'android-standalone'
    | 'android-native'
    | 'ios-web'
    | 'ios-standalone'
    | 'ios-native'
    | 'other-web'
    | 'other-standalone'
    | 'other-native';
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

interface RemoveUserFromChatApiParams {
  chatId: number;
  userId: number;
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
  roomId?: number;
  clubId?: number;
  cityId?: number | null;
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

interface SendEmailVerificationApiParams {

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

interface ToggleUnsubNotifApiParams {
  entityType: UnsubNotifEntity;
  entityId: number;
}

interface TopLevelClubsApiParams {
  showAdult?: boolean;
  order?: 'members' | 'name' | 'membersWithJitter';
  limit?: number | -1;
  cursor?: string;
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

interface UnauthMeetupRegisterApiParams {
  email: string;
  name: string;
  meetupId: number;
  status: 'going' | 'interested' | 'notGoing';
  inviteToken: string;
}

interface UnauthMeetupVerifyEmailApiParams {
  status: 'going' | 'interested' | 'notGoing';
  token: string;
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

interface UnsubNotifApiParams {
  entityType: UnsubNotifEntity;
  entityId: number;
}

interface UpdateAccountSettingsApiParams {
  email?: string;
  newPassword?: string;
  currentPassword: string | null;
}

interface UpdateClubsOrderApiParams {
  clubIdsOrder: number[];
  clubVisibilities: {
    clubId: number;
    visibility: 'public' | 'mutual' | 'private';
  }[];
}

interface UpdateClubVisibilityApiParams {
  clubId: number;
  visibility: 'public' | 'mutual' | 'private';
}

interface UpdateUserCityApiParams {
  cityId: number | null;
}

interface UpdateUserProfileApiParams {
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

interface VerifyEmailApiParams {
  token: string;
}

interface VerifyResetPasswordApiParams {
  token: string;
  password: string;
}

interface AccountStatusApiData {
  hasPassword: boolean;
  emailVerified: boolean;
}

interface AppleLoginUserApiData {
  currentUserId: number;
  authToken: string;
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

interface CreateMeetupResponseApiData {
  showCreatePostUpsell?: boolean;
  showVerifyEmailUpsell?: boolean;
}

interface CreateOrEditMeetupApiData {
  meetupId?: number;
}

interface CreateOrEditPostApiData {
  postId?: number;
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

interface GoogleLoginUserApiData {
  currentUserId: number;
  authToken: string;
}

interface LoginUserApiData {
  currentUserId: number;
  authToken: string;
}

interface MeetupInvitableUsersApiData {
  items: number[];
  cursor?: string;
  hasCompleted: boolean;
}

interface MeetupInvitesApiData {
  items: number[];
  cursor?: string;
  hasCompleted: boolean;
}

interface MeetupPollResponsesApiData {
  items: number[];
  cursor?: string;
  hasCompleted: boolean;
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

interface MyInvitableMeetupsApiData {
  items: number[];
  cursor?: string;
  hasCompleted: boolean;
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

interface UnauthMeetupVerifyEmailApiData {
  currentUserId: number;
  authToken: string;
  meetupId: number;
}

interface UnreadChatsCountApiData {
  count: number;
}

interface UnseenNotifIdsApiData {
  notifIds: Partial<Record<NotifScope, number[]>>;
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

interface VerifyEmailApiData {
  hasVerified: boolean;
}

interface VerifyResetPasswordApiData {
  currentUserId: number;
  authToken: string;
}

type ApiNameToParams = {
  'accountStatus': AccountStatusApiParams,
  'addMeetupPollOption': AddMeetupPollOptionApiParams,
  'addUserToChat': AddUserToChatApiParams,
  'allUserClubsInfo': AllUserClubsInfoApiParams,
  'appleLoginUser': AppleLoginUserApiParams,
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
  'createMeetupInvites': CreateMeetupInvitesApiParams,
  'createMeetupPoll': CreateMeetupPollApiParams,
  'createMeetupResponse': CreateMeetupResponseApiParams,
  'createOrEditMeetup': CreateOrEditMeetupApiParams,
  'createOrEditPost': CreateOrEditPostApiParams,
  'createReaction': CreateReactionApiParams,
  'createReply': CreateReplyApiParams,
  'createReport': CreateReportApiParams,
  'currentUser': CurrentUserApiParams,
  'currentUserClubMemberships': CurrentUserClubMembershipsApiParams,
  'deleteAccount': DeleteAccountApiParams,
  'deleteMeetup': DeleteMeetupApiParams,
  'deletePost': DeletePostApiParams,
  'deleteReaction': DeleteReactionApiParams,
  'deleteReply': DeleteReplyApiParams,
  'existingChatWithUser': ExistingChatWithUserApiParams,
  'favoriteClubs': FavoriteClubsApiParams,
  'followUser': FollowUserApiParams,
  'googleLoginUser': GoogleLoginUserApiParams,
  'joinClub': JoinClubApiParams,
  'joinClubs': JoinClubsApiParams,
  'leaveClub': LeaveClubApiParams,
  'loginUser': LoginUserApiParams,
  'meetup': MeetupApiParams,
  'meetupInvitableUsers': MeetupInvitableUsersApiParams,
  'meetupInvites': MeetupInvitesApiParams,
  'meetupMessageAll': MeetupMessageAllApiParams,
  'meetupPollResponses': MeetupPollResponsesApiParams,
  'meetupPolls': MeetupPollsApiParams,
  'meetupResponses': MeetupResponsesApiParams,
  'meetups': MeetupsApiParams,
  'myClubsRoomsView': MyClubsRoomsViewApiParams,
  'myInvitableMeetups': MyInvitableMeetupsApiParams,
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
  'removeUserFromChat': RemoveUserFromChatApiParams,
  'replies': RepliesApiParams,
  'reply': ReplyApiParams,
  'resetPassword': ResetPasswordApiParams,
  'room': RoomApiParams,
  'rooms': RoomsApiParams,
  'roomsInClub': RoomsInClubApiParams,
  'searchCities': SearchCitiesApiParams,
  'seenNotifs': SeenNotifsApiParams,
  'sendEmailVerification': SendEmailVerificationApiParams,
  'sseOtp': SseOtpApiParams,
  'sseSubscribe': SseSubscribeApiParams,
  'sseUnsubscribe': SseUnsubscribeApiParams,
  'status': StatusApiParams,
  'toggleMeetupPollResponse': ToggleMeetupPollResponseApiParams,
  'toggleUnsubNotif': ToggleUnsubNotifApiParams,
  'topLevelClubs': TopLevelClubsApiParams,
  'topPostReplies': TopPostRepliesApiParams,
  'topUsers': TopUsersApiParams,
  'unauthMeetupRegister': UnauthMeetupRegisterApiParams,
  'unauthMeetupVerifyEmail': UnauthMeetupVerifyEmailApiParams,
  'unblockClub': UnblockClubApiParams,
  'unblockUser': UnblockUserApiParams,
  'unfollowUser': UnfollowUserApiParams,
  'unreadChatsCount': UnreadChatsCountApiParams,
  'unseenNotifIds': UnseenNotifIdsApiParams,
  'unsubNotif': UnsubNotifApiParams,
  'updateAccountSettings': UpdateAccountSettingsApiParams,
  'updateClubsOrder': UpdateClubsOrderApiParams,
  'updateClubVisibility': UpdateClubVisibilityApiParams,
  'updateUserCity': UpdateUserCityApiParams,
  'updateUserProfile': UpdateUserProfileApiParams,
  'user': UserApiParams,
  'userClubsWithPosts': UserClubsWithPostsApiParams,
  'userFollows': UserFollowsApiParams,
  'userFriends': UserFriendsApiParams,
  'users': UsersApiParams,
  'userView': UserViewApiParams,
  'verifyEmail': VerifyEmailApiParams,
  'verifyResetPassword': VerifyResetPasswordApiParams,
};

type ApiNameToData = {
  'accountStatus': AccountStatusApiData,
  'addMeetupPollOption': null,
  'addUserToChat': null,
  'allUserClubsInfo': null,
  'appleLoginUser': AppleLoginUserApiData,
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
  'createMeetupInvites': null,
  'createMeetupPoll': null,
  'createMeetupResponse': CreateMeetupResponseApiData,
  'createOrEditMeetup': CreateOrEditMeetupApiData,
  'createOrEditPost': CreateOrEditPostApiData,
  'createReaction': null,
  'createReply': null,
  'createReport': null,
  'currentUser': CurrentUserApiData,
  'currentUserClubMemberships': CurrentUserClubMembershipsApiData,
  'deleteAccount': null,
  'deleteMeetup': null,
  'deletePost': null,
  'deleteReaction': null,
  'deleteReply': null,
  'existingChatWithUser': ExistingChatWithUserApiData,
  'favoriteClubs': FavoriteClubsApiData,
  'followUser': null,
  'googleLoginUser': GoogleLoginUserApiData,
  'joinClub': null,
  'joinClubs': null,
  'leaveClub': null,
  'loginUser': LoginUserApiData,
  'meetup': null,
  'meetupInvitableUsers': MeetupInvitableUsersApiData,
  'meetupInvites': MeetupInvitesApiData,
  'meetupMessageAll': null,
  'meetupPollResponses': MeetupPollResponsesApiData,
  'meetupPolls': null,
  'meetupResponses': MeetupResponsesApiData,
  'meetups': MeetupsApiData,
  'myClubsRoomsView': MyClubsRoomsViewApiData,
  'myInvitableMeetups': MyInvitableMeetupsApiData,
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
  'removeUserFromChat': null,
  'replies': RepliesApiData,
  'reply': null,
  'resetPassword': null,
  'room': null,
  'rooms': RoomsApiData,
  'roomsInClub': null,
  'searchCities': SearchCitiesApiData,
  'seenNotifs': null,
  'sendEmailVerification': null,
  'sseOtp': SseOtpApiData,
  'sseSubscribe': null,
  'sseUnsubscribe': null,
  'status': StatusApiData,
  'toggleMeetupPollResponse': ToggleMeetupPollResponseApiData,
  'toggleUnsubNotif': null,
  'topLevelClubs': TopLevelClubsApiData,
  'topPostReplies': TopPostRepliesApiData,
  'topUsers': TopUsersApiData,
  'unauthMeetupRegister': null,
  'unauthMeetupVerifyEmail': UnauthMeetupVerifyEmailApiData,
  'unblockClub': null,
  'unblockUser': null,
  'unfollowUser': null,
  'unreadChatsCount': UnreadChatsCountApiData,
  'unseenNotifIds': UnseenNotifIdsApiData,
  'unsubNotif': null,
  'updateAccountSettings': UpdateAccountSettingsApiData,
  'updateClubsOrder': null,
  'updateClubVisibility': null,
  'updateUserCity': null,
  'updateUserProfile': null,
  'user': null,
  'userClubsWithPosts': UserClubsWithPostsApiData,
  'userFollows': UserFollowsApiData,
  'userFriends': UserFriendsApiData,
  'users': UsersApiData,
  'userView': null,
  'verifyEmail': VerifyEmailApiData,
  'verifyResetPassword': VerifyResetPasswordApiData,
};

type ApiName = 'accountStatus'
  | 'addMeetupPollOption'
  | 'addUserToChat'
  | 'allUserClubsInfo'
  | 'appleLoginUser'
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
  | 'createMeetupInvites'
  | 'createMeetupPoll'
  | 'createMeetupResponse'
  | 'createOrEditMeetup'
  | 'createOrEditPost'
  | 'createReaction'
  | 'createReply'
  | 'createReport'
  | 'currentUser'
  | 'currentUserClubMemberships'
  | 'deleteAccount'
  | 'deleteMeetup'
  | 'deletePost'
  | 'deleteReaction'
  | 'deleteReply'
  | 'existingChatWithUser'
  | 'favoriteClubs'
  | 'followUser'
  | 'googleLoginUser'
  | 'joinClub'
  | 'joinClubs'
  | 'leaveClub'
  | 'loginUser'
  | 'meetup'
  | 'meetupInvitableUsers'
  | 'meetupInvites'
  | 'meetupMessageAll'
  | 'meetupPollResponses'
  | 'meetupPolls'
  | 'meetupResponses'
  | 'meetups'
  | 'myClubsRoomsView'
  | 'myInvitableMeetups'
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
  | 'removeUserFromChat'
  | 'replies'
  | 'reply'
  | 'resetPassword'
  | 'room'
  | 'rooms'
  | 'roomsInClub'
  | 'searchCities'
  | 'seenNotifs'
  | 'sendEmailVerification'
  | 'sseOtp'
  | 'sseSubscribe'
  | 'sseUnsubscribe'
  | 'status'
  | 'toggleMeetupPollResponse'
  | 'toggleUnsubNotif'
  | 'topLevelClubs'
  | 'topPostReplies'
  | 'topUsers'
  | 'unauthMeetupRegister'
  | 'unauthMeetupVerifyEmail'
  | 'unblockClub'
  | 'unblockUser'
  | 'unfollowUser'
  | 'unreadChatsCount'
  | 'unseenNotifIds'
  | 'unsubNotif'
  | 'updateAccountSettings'
  | 'updateClubsOrder'
  | 'updateClubVisibility'
  | 'updateUserCity'
  | 'updateUserProfile'
  | 'user'
  | 'userClubsWithPosts'
  | 'userFollows'
  | 'userFriends'
  | 'users'
  | 'userView'
  | 'verifyEmail'
  | 'verifyResetPassword';

type AuthApiName = 'accountStatus'
| 'addMeetupPollOption'
| 'addUserToChat'
| 'allUserClubsInfo'
| 'approveMeetupResponse'
| 'blockClub'
| 'blockUser'
| 'chat'
| 'chats'
| 'createChat'
| 'createClub'
| 'createClubInvite'
| 'createMeetupInvites'
| 'createMeetupPoll'
| 'createMeetupResponse'
| 'createOrEditMeetup'
| 'createOrEditPost'
| 'createReaction'
| 'createReply'
| 'createReport'
| 'currentUser'
| 'currentUserClubMemberships'
| 'deleteAccount'
| 'deleteMeetup'
| 'deletePost'
| 'deleteReaction'
| 'deleteReply'
| 'existingChatWithUser'
| 'followUser'
| 'joinClub'
| 'joinClubs'
| 'leaveClub'
| 'meetupInvitableUsers'
| 'meetupInvites'
| 'meetupMessageAll'
| 'myInvitableMeetups'
| 'notifs'
| 'postReplyThreads'
| 'reactionCounts'
| 'reactions'
| 'readChat'
| 'readNotif'
| 'regenerateMeetupInviteToken'
| 'registerPushNotifToken'
| 'removeUserFromChat'
| 'seenNotifs'
| 'sendEmailVerification'
| 'toggleMeetupPollResponse'
| 'toggleUnsubNotif'
| 'unblockClub'
| 'unblockUser'
| 'unfollowUser'
| 'unreadChatsCount'
| 'unseenNotifIds'
| 'unsubNotif'
| 'updateAccountSettings'
| 'updateClubsOrder'
| 'updateClubVisibility'
| 'updateUserCity'
| 'updateUserProfile';
