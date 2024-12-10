interface AccountStatusApiParams {

}

interface AddMeetupPollOptionApiParams {
  pollId: number;
  option: string;
  inviteToken?: string | null;
}

interface AddToPrivateMessageApiParams {
  msgId: number;
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
  /**
   * @maxItems 50
   */
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

interface BulkUploadImagesApiParams {
  /**
   * @maxItems 15
   */
  files?: Express.Multer.File[];
  /**
   * @maxItems 15
   */
  images: {
    isDisplayPic?: boolean;
    clubId?: number;
    url?: string;
    fileIdx?: number;
    pickerId: number;
  }[];
  followeesOnly?: boolean;
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
  showAdult?: 'no' | 'yes' | 'always';
  minMembers?: number;
  limit?: number;
  cursor?: string;
}

interface ClubsByNameApiParams {
  /**
   * @maxItems 1000
   */
  names: string[];
}

interface ClubViewApiParams {
  clubId?: number;
  clubName?: string;
}

interface CreateClubApiParams {
  id?: number;
  parentClubName: string;
  name: string;
  description?: string | null;
  confirmedCorrectParent?: boolean;
}

interface CreateClubInviteApiParams {
  clubId: number;
}

interface CreateMeetupInvitesApiParams {
  meetupId: number;
  inviteToken?: string | null;
  /**
   * @maxItems 1000
   */
  inviteeIds: number[];
}

interface CreateMeetupPollApiParams {
  meetupId: number;
  title: string;
  /**
   * @maxItems 20
   */
  options: string[];
  isRequired: boolean;
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
  visibility?: 'public' | 'followees' | 'private';
  responseApproval: 'none' | 'nonFollowees' | 'always';
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
  followeesOnly?: boolean;
  isAdult?: boolean;
  confirmedRelated?: boolean;
}

interface CreatePrivateMessageApiParams {
  /**
   * @maxItems 100
   */
  recipientIds: number[];
  content: string;
}

interface CreateReactionApiParams {
  entityType: 'postReply' | 'roomReply' | 'privateMessageReply' | 'meetupReply' | 'userReply' | 'post';
  entityId: number;
  reactType: string;
}

interface CreateReplyApiParams {
  replyType: 'postReply' | 'roomReply' | 'privateMessageReply' | 'meetupReply' | 'userReply';
  parentEntityId?: number;
  parentReplyId?: number;
  content: string;
  meetupInviteToken?: string | null;
  /**
   * @maxItems 20
   */
  mentionedUsers?: number[];
  /**
   * @maxItems 9
   */
  images?: Express.Multer.File[];
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

interface DeleteMeetupInvitesApiParams {
  meetupId: number;
  /**
   * @maxItems 1000
   */
  userIds: number[];
}

interface DeleteMeetupPollOptionApiParams {
  pollId: number;
  optionId: number;
}

interface DeletePostApiParams {
  postId: number;
}

interface DeleteReactionApiParams {
  entityType: 'postReply' | 'roomReply' | 'privateMessageReply' | 'meetupReply' | 'userReply' | 'post';
  entityId: number;
}

interface DeleteReplyApiParams {
  replyType: 'postReply' | 'roomReply' | 'privateMessageReply' | 'meetupReply' | 'userReply';
  replyId: number;
}

interface EditMeetupPollApiParams {
  pollId: number;
  title: string;
  isRequired: boolean;
}

interface ExchangeInstagramTokenApiParams {
  authCode: string;
}

interface ExistingMsgWithUserApiParams {
  userId: number;
}

interface FavoriteClubsApiParams {
  clubName: string;
}

interface FollowUserApiParams {
  followeeId: number;
}

interface FtueSeenTimeApiParams {
  ftueTypes: string[];
}

interface GoogleLoginUserApiParams {
  token: string;
  type: 'login' | 'register';
}

interface HealthchecksApiParams {

}

interface ImagesFromUrlApiParams {
  url: string;
  urlContent?: string;
}

interface ImportFromInstagramApiParams {

}

interface JoinClubApiParams {
  clubId: number;
}

interface JoinClubsApiParams {
  /**
   * @maxItems 100
   */
  clubIds: number[];
}

interface LeaveClubApiParams {
  clubId: number;
}

interface LoginAsUserApiParams {
  userId: number;
}

interface LoginUserApiParams {
  email: string;
  password: string;
}

interface MeetupInvitableUsersApiParams {
  meetupId: number;
  inviteToken?: string | null;
  pastMeetupId?: number | null;
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
  /**
   * @maxItems 1000
   */
  unauthClubs?: string[];
  limit?: number;
  order?: 'time' | 'userScore';
  cursor?: string;
}

interface MeetupsApiParams {
  clubName: string;
  /**
   * @maxItems 1000
   */
  unauthClubs?: string[];
  connectionType?: 'hosting' | 'attending' | 'invited' | 'connected' | 'notConnected';
  followingType?: 'following' | 'notFollowing' | 'friends' | 'self';
  location?: 'city' | 'online';
  search?: string;
  afterTime?: number;
  beforeTime?: number;
  limit?: number;
  cursor?: string;
}

interface MeetupViewApiParams {
  meetupId: number;
  inviteToken: string | null;
  includeAttendees?: boolean;
  includeNumHosted?: boolean;
}

interface MentionableUsersApiParams {
  name?: string;
  contextEntityType: 'post' | 'room' | 'privateMessage' | 'meetup' | 'user';
  contextEntityId: number;
  limit?: number;
}

interface MutualMeetupsApiParams {
  userId: number;
  limit?: number;
  cursor?: string;
}

interface MutualMeetupUsersApiParams {
  meetupId: number;
  limit?: number;
  cursor?: string;
}

interface MyClubsRoomsViewApiParams {
  /**
   * @maxItems 1000
   */
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

interface NotifSettingsApiParams {

}

interface OnboardCompleteProfileApiParams {

}

interface PostApiParams {
  postId: number;
}

interface PostReplyParticipantApiParams {
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
  /**
   * @maxItems 1000
   */
  unauthClubs: string[];
  location: 'city' | 'global' | 'globalOnly';
  authorId?: number;
  lastViewedPost?: number;
  limit?: number;
  sort?: 'hot' | 'lastReply' | 'new';
  cursor?: string;
}

interface PrivateMessageApiParams {
  msgId: number;
}

interface PrivateMessagesApiParams {
  accepted: boolean;
  limit?: number;
  cursor?: string;
}

interface RandomUsersApiParams {
  /**
   * @maxItems 1000
   */
  unauthClubs: string[];
  location?: 'city' | 'global';
  ctxUserId?: number;
  limit?: number;
}

interface ReactionCountsApiParams {
  entityType: 'postReply' | 'roomReply' | 'privateMessageReply' | 'meetupReply' | 'userReply' | 'post';
  entityId: number;
}

interface ReactionsApiParams {
  entityType: 'postReply' | 'roomReply' | 'privateMessageReply' | 'meetupReply' | 'userReply' | 'post';
  entityId: number;
  reactType?: string;
  cursor?: string;
  limit?: number;
}

interface ReadMeetupDiscussionApiParams {
  meetupId: number;
}

interface ReadNotifApiParams {
  notifId: number;
}

interface ReadPrivateMessageApiParams {
  msgId: number;
}

interface ReadRoomApiParams {
  roomId: number;
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
}

interface RelatedUsersApiParams {
  /**
   * @maxItems 1000
   */
  unauthClubs: string[];
  location: 'city' | 'global' | 'globalOnly';
  lowQualityUsers?: boolean;
  excludeFollowing?: boolean;
  isOnboarding?: boolean;
  cursor?: string;
  limit?: number;
}

interface RemoveFromPrivateMessageApiParams {
  msgId: number;
  userId: number;
}

interface RepliedRoomsApiParams {
  limit?: number;
  cursor?: string;
}

interface RepliesApiParams {
  replyType: 'postReply' | 'roomReply' | 'privateMessageReply' | 'meetupReply' | 'userReply';
  parentEntityId?: number;
  parentReplyId?: number;
  oldestFirst?: boolean;
  initialId?: number;
  meetupInviteToken?: string | null;
  limit?: number;
  cursor?: string;
}

interface ReplyApiParams {
  replyType: 'postReply' | 'roomReply' | 'privateMessageReply' | 'meetupReply' | 'userReply';
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

interface RoomParticipantApiParams {
  roomId: number;
}

interface RoomsApiParams {
  clubName: string;
  /**
   * @maxItems 1000
   */
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

interface SeenFtueApiParams {
  ftueType: string;
}

interface SeenNotifsApiParams {
  scopes: ('general' | 'replies' | 'messages' | 'messageRequests' | 'postReplies')[];
}

interface SendEmailVerificationApiParams {

}

interface SseOtpApiParams {

}

interface SseSubscribeApiParams {
  sessionId: string;
  /**
   * @maxItems 20
   */
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
  meetupId: number;
  pollId: number;
  optionId: number;
  inviteToken?: string | null;
}

interface ToggleUnsubEmailApiParams {
  type: 'sub' | 'unsub';
  token: string;
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
  /**
   * @maxItems 1000
   */
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

interface UnreadMsgsCountApiParams {

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
  /**
   * @maxItems 1000
   */
  clubIdsOrder: number[];
  clubVisibilities: {
    clubId: number;
    visibility: 'public' | 'related' | 'mutual';
  }[];
}

interface UpdateClubVisibilityApiParams {
  clubId: number;
  visibility: 'public' | 'related' | 'mutual';
}

interface UpdateNotifSettingsApiParams {
  updatedSettings: {
    channel: NotifChannel;
    push?: boolean;
    email?: boolean;
  }[];
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
  /**
   * @maxItems 3
   */
  coverPhotos?: Express.Multer.File[];
  /**
   * @maxItems 3
   */
  coverPhotoSlots: {
    fileIdx?: number;
    url?: string;
  }[];
  photo?: Express.Multer.File;
  photoCrop?: {
    top: number;
    left: number;
    right: number;
    bot: number;
  };
  clearedPhoto?: boolean;
  /**
   * @maxItems 4
   */
  links?: string[];
}

interface UserApiParams {
  userId: number;
}

interface UserClubsWithPostsApiParams {
  userId: number;
  /**
   * @maxItems 1000
   */
  unauthClubs: string[];
  cursor?: string;
  limit?: number;
}

interface UserFollowsApiParams {
  userId: number;
  followType: 'followers' | 'following' | 'mutuals';
  cursor?: string;
  limit?: number;
}

interface UserFriendsApiParams {
  userId: number;
  cursor?: string;
  limit?: number;
}

interface UserInfoApiParams {
  userId: number;
}

interface UserNumMeetupsApiParams {
  userId: number;
}

interface UsersApiParams {
  clubName: string;
  followingType?: 'onlyFollowing' | 'onlyFollowers' | 'excludeFollowing' | 'followingFirst' | 'followersFirst';
  /**
   * @maxItems 1000
   */
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
  isExisting: boolean;
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

interface BulkUploadImagesApiData {
  uploaded: {
    pickerId: number;
    success: boolean;
  }[];
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
  /**
   * @maxItems 1000
   */
  memberIds: number[];
}

interface ClubsApiData {
  /**
   * @maxItems 1000
   */
  items: number[];
  cursor?: string;
  hasCompleted: boolean;
}

interface ClubsByNameApiData {
  clubs: {
    /**
     * This interface was referenced by `undefined`'s JSON-Schema definition
     * via the `patternProperty` '^.*$'.
     */
    [k: string]: number;
  };
}

interface ClubViewApiData {
  /**
   * @maxItems 1000
   */
  siblingClubIds: number[];
  /**
   * @maxItems 1000
   */
  subClubIds: number[];
  clubDepth?: number;
}

interface CreateClubApiData {
  name: string;
}

interface CreateClubInviteApiData {
  clubInviteToken: string;
}

interface CreateMeetupResponseApiData {
  isApproved: boolean;
  showCreatePostUpsell?: boolean;
  showVerifyEmailUpsell?: boolean;
}

interface CreateOrEditMeetupApiData {
  meetupId?: number;
}

interface CreateOrEditPostApiData {
  postId?: number;
}

interface CreatePrivateMessageApiData {
  msgId?: number;
}

interface CurrentUserApiData {
  currentUserId: number;
  /**
   * @maxItems 1000
   */
  clubIds: number[];
  /**
   * @maxItems 1000
   */
  clubMembershipIds: number[];
  userData: {
    hasMeetupResponse?: boolean;
    hasPost?: boolean;
  };
}

interface CurrentUserClubMembershipsApiData {
  /**
   * @maxItems 1000
   */
  items: number[];
  cursor?: string;
  hasCompleted: boolean;
}

interface ExchangeInstagramTokenApiData {
  accessToken?: string;
}

interface ExistingMsgWithUserApiData {
  msgId: number | null;
}

interface FavoriteClubsApiData {
  /**
   * @maxItems 1000
   */
  topClubIds: number[];
  type: 'favorite' | 'top';
}

interface GoogleLoginUserApiData {
  currentUserId: number;
  authToken: string;
  isExisting: boolean;
}

interface HealthchecksApiData {
  serverId: number;
  /**
   * @maxItems 1000
   */
  failingHealthchecks: string[];
  isInitInfra?: boolean;
}

interface ImagesFromUrlApiData {
  dpUrl?: string | null;
  images?: {
    url: string;
    clubName?: string | null;
  }[];
  shouldRequestIgAccessToken?: boolean;
}

interface ImportFromInstagramApiData {
  hasAccessToken: boolean;
  username?: string;
  dpUrl?: string | null;
  imageUrls?: string[];
}

interface LoginAsUserApiData {
  currentUserId: number;
  authToken: string;
}

interface LoginUserApiData {
  currentUserId: number;
  authToken: string;
}

interface MeetupInvitableUsersApiData {
  /**
   * @maxItems 1000
   */
  items: number[];
  cursor?: string;
  hasCompleted: boolean;
}

interface MeetupInvitesApiData {
  /**
   * @maxItems 1000
   */
  items: number[];
  cursor?: string;
  hasCompleted: boolean;
}

interface MeetupPollResponsesApiData {
  /**
   * @maxItems 1000
   */
  items: number[];
  cursor?: string;
  hasCompleted: boolean;
}

interface MeetupResponsesApiData {
  /**
   * @maxItems 1000
   */
  items: number[];
  cursor?: string;
  hasCompleted: boolean;
}

interface MeetupsApiData {
  /**
   * @maxItems 1000
   */
  items: number[];
  cursor?: string;
  hasCompleted: boolean;
}

interface MeetupViewApiData {
  numHosted?: number;
}

interface MentionableUsersApiData {
  /**
   * @maxItems 1000
   */
  userIds: number[];
}

interface MutualMeetupsApiData {
  /**
   * @maxItems 1000
   */
  items: number[];
  cursor?: string;
  hasCompleted: boolean;
}

interface MutualMeetupUsersApiData {
  /**
   * @maxItems 1000
   */
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
  /**
   * @maxItems 1000
   */
  items: number[];
  cursor?: string;
  hasCompleted: boolean;
}

interface NotifsApiData {
  /**
   * @maxItems 1000
   */
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
  maxItems: number;
}

interface PostReplyThreadsApiData {
  /**
   * @maxItems 1000
   */
  items: number[];
  cursor?: string;
  hasCompleted: boolean;
}

interface PostsApiData {
  /**
   * @maxItems 1000
   */
  items: number[];
  cursor?: string;
  hasCompleted: boolean;
}

interface PrivateMessagesApiData {
  /**
   * @maxItems 1000
   */
  items: number[];
  cursor?: string;
  hasCompleted: boolean;
}

interface RandomUsersApiData {
  /**
   * @maxItems 1000
   */
  userIds: number[];
}

interface ReactionsApiData {
  /**
   * @maxItems 1000
   */
  items: number[];
  cursor?: string;
  hasCompleted: boolean;
}

interface RecentFollowingPostsApiData {
  /**
   * @maxItems 1000
   */
  items: number[];
  cursor?: string;
  hasCompleted: boolean;
}

interface RegisterUserApiData {
  currentUserId: number;
  authToken: string;
  isExisting: boolean;
}

interface RelatedUsersApiData {
  /**
   * @maxItems 1000
   */
  items: number[];
  cursor?: string;
  hasCompleted: boolean;
}

interface RepliedRoomsApiData {
  /**
   * @maxItems 1000
   */
  items: number[];
  cursor?: string;
  hasCompleted: boolean;
}

interface RepliesApiData {
  /**
   * @maxItems 1000
   */
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
  /**
   * @maxItems 1000
   */
  cityIds: number[];
}

interface SseOtpApiData {
  otp: string | null;
}

interface StatusApiData {
  isHealthy: boolean;
}

interface ToggleMeetupPollResponseApiData {
  type?: 'create' | 'delete';
}

interface ToggleUnsubEmailApiData {
  isSubbed: boolean;
  email?: string;
}

interface TopLevelClubsApiData {
  /**
   * @maxItems 1000
   */
  items: number[];
  cursor?: string;
  hasCompleted: boolean;
}

interface TopPostRepliesApiData {
  /**
   * @maxItems 1000
   */
  topReplyIds?: number[];
}

interface TopUsersApiData {
  /**
   * @maxItems 1000
   */
  items: number[];
  cursor?: string;
  hasCompleted: boolean;
}

interface UnauthMeetupVerifyEmailApiData {
  currentUserId: number;
  authToken: string;
  meetupId: number;
}

interface UnreadMsgsCountApiData {
  count: number;
}

interface UnseenNotifIdsApiData {
  notifIds: Partial<Record<NotifScope, number[]>>;
}

interface UpdateAccountSettingsApiData {

}

interface UserClubsWithPostsApiData {
  /**
   * @maxItems 1000
   */
  items: number[];
  cursor?: string;
  hasCompleted: boolean;
}

interface UserFollowsApiData {
  /**
   * @maxItems 1000
   */
  items: number[];
  cursor?: string;
  hasCompleted: boolean;
}

interface UserFriendsApiData {
  /**
   * @maxItems 1000
   */
  items: number[];
  cursor?: string;
  hasCompleted: boolean;
}

interface UserInfoApiData {
  numMutuals: number;
  /**
   * @maxItems 1000
   */
  latestMutuals?: number[];
  numMeetups?: number;
}

interface UserNumMeetupsApiData {
  numAttended: number;
  numHosted: number;
}

interface UsersApiData {
  /**
   * @maxItems 1000
   */
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
  'addToPrivateMessage': AddToPrivateMessageApiParams,
  'allUserClubsInfo': AllUserClubsInfoApiParams,
  'appleLoginUser': AppleLoginUserApiParams,
  'approveMeetupResponse': ApproveMeetupResponseApiParams,
  'batched': BatchedApiParams,
  'blockClub': BlockClubApiParams,
  'blockUser': BlockUserApiParams,
  'bulkUploadImages': BulkUploadImagesApiParams,
  'checkEntityExists': CheckEntityExistsApiParams,
  'city': CityApiParams,
  'club': ClubApiParams,
  'clubInvite': ClubInviteApiParams,
  'clubs': ClubsApiParams,
  'clubsByName': ClubsByNameApiParams,
  'clubView': ClubViewApiParams,
  'createClub': CreateClubApiParams,
  'createClubInvite': CreateClubInviteApiParams,
  'createMeetupInvites': CreateMeetupInvitesApiParams,
  'createMeetupPoll': CreateMeetupPollApiParams,
  'createMeetupResponse': CreateMeetupResponseApiParams,
  'createOrEditMeetup': CreateOrEditMeetupApiParams,
  'createOrEditPost': CreateOrEditPostApiParams,
  'createPrivateMessage': CreatePrivateMessageApiParams,
  'createReaction': CreateReactionApiParams,
  'createReply': CreateReplyApiParams,
  'createReport': CreateReportApiParams,
  'currentUser': CurrentUserApiParams,
  'currentUserClubMemberships': CurrentUserClubMembershipsApiParams,
  'deleteAccount': DeleteAccountApiParams,
  'deleteMeetup': DeleteMeetupApiParams,
  'deleteMeetupInvites': DeleteMeetupInvitesApiParams,
  'deleteMeetupPollOption': DeleteMeetupPollOptionApiParams,
  'deletePost': DeletePostApiParams,
  'deleteReaction': DeleteReactionApiParams,
  'deleteReply': DeleteReplyApiParams,
  'editMeetupPoll': EditMeetupPollApiParams,
  'exchangeInstagramToken': ExchangeInstagramTokenApiParams,
  'existingMsgWithUser': ExistingMsgWithUserApiParams,
  'favoriteClubs': FavoriteClubsApiParams,
  'followUser': FollowUserApiParams,
  'ftueSeenTime': FtueSeenTimeApiParams,
  'googleLoginUser': GoogleLoginUserApiParams,
  'healthchecks': HealthchecksApiParams,
  'imagesFromUrl': ImagesFromUrlApiParams,
  'importFromInstagram': ImportFromInstagramApiParams,
  'joinClub': JoinClubApiParams,
  'joinClubs': JoinClubsApiParams,
  'leaveClub': LeaveClubApiParams,
  'loginAsUser': LoginAsUserApiParams,
  'loginUser': LoginUserApiParams,
  'meetupInvitableUsers': MeetupInvitableUsersApiParams,
  'meetupInvites': MeetupInvitesApiParams,
  'meetupMessageAll': MeetupMessageAllApiParams,
  'meetupPollResponses': MeetupPollResponsesApiParams,
  'meetupPolls': MeetupPollsApiParams,
  'meetupResponses': MeetupResponsesApiParams,
  'meetups': MeetupsApiParams,
  'meetupView': MeetupViewApiParams,
  'mentionableUsers': MentionableUsersApiParams,
  'mutualMeetups': MutualMeetupsApiParams,
  'mutualMeetupUsers': MutualMeetupUsersApiParams,
  'myClubsRoomsView': MyClubsRoomsViewApiParams,
  'myInvitableMeetups': MyInvitableMeetupsApiParams,
  'notifs': NotifsApiParams,
  'notifSettings': NotifSettingsApiParams,
  'onboardCompleteProfile': OnboardCompleteProfileApiParams,
  'post': PostApiParams,
  'postReplyParticipant': PostReplyParticipantApiParams,
  'postReplyThreads': PostReplyThreadsApiParams,
  'posts': PostsApiParams,
  'privateMessage': PrivateMessageApiParams,
  'privateMessages': PrivateMessagesApiParams,
  'randomUsers': RandomUsersApiParams,
  'reactionCounts': ReactionCountsApiParams,
  'reactions': ReactionsApiParams,
  'readMeetupDiscussion': ReadMeetupDiscussionApiParams,
  'readNotif': ReadNotifApiParams,
  'readPrivateMessage': ReadPrivateMessageApiParams,
  'readRoom': ReadRoomApiParams,
  'recentFollowingPosts': RecentFollowingPostsApiParams,
  'regenerateMeetupInviteToken': RegenerateMeetupInviteTokenApiParams,
  'registerPushNotifToken': RegisterPushNotifTokenApiParams,
  'registerUser': RegisterUserApiParams,
  'relatedUsers': RelatedUsersApiParams,
  'removeFromPrivateMessage': RemoveFromPrivateMessageApiParams,
  'repliedRooms': RepliedRoomsApiParams,
  'replies': RepliesApiParams,
  'reply': ReplyApiParams,
  'resetPassword': ResetPasswordApiParams,
  'room': RoomApiParams,
  'roomParticipant': RoomParticipantApiParams,
  'rooms': RoomsApiParams,
  'roomsInClub': RoomsInClubApiParams,
  'searchCities': SearchCitiesApiParams,
  'seenFtue': SeenFtueApiParams,
  'seenNotifs': SeenNotifsApiParams,
  'sendEmailVerification': SendEmailVerificationApiParams,
  'sseOtp': SseOtpApiParams,
  'sseSubscribe': SseSubscribeApiParams,
  'sseUnsubscribe': SseUnsubscribeApiParams,
  'status': StatusApiParams,
  'toggleMeetupPollResponse': ToggleMeetupPollResponseApiParams,
  'toggleUnsubEmail': ToggleUnsubEmailApiParams,
  'toggleUnsubNotif': ToggleUnsubNotifApiParams,
  'topLevelClubs': TopLevelClubsApiParams,
  'topPostReplies': TopPostRepliesApiParams,
  'topUsers': TopUsersApiParams,
  'unauthMeetupRegister': UnauthMeetupRegisterApiParams,
  'unauthMeetupVerifyEmail': UnauthMeetupVerifyEmailApiParams,
  'unblockClub': UnblockClubApiParams,
  'unblockUser': UnblockUserApiParams,
  'unfollowUser': UnfollowUserApiParams,
  'unreadMsgsCount': UnreadMsgsCountApiParams,
  'unseenNotifIds': UnseenNotifIdsApiParams,
  'unsubNotif': UnsubNotifApiParams,
  'updateAccountSettings': UpdateAccountSettingsApiParams,
  'updateClubsOrder': UpdateClubsOrderApiParams,
  'updateClubVisibility': UpdateClubVisibilityApiParams,
  'updateNotifSettings': UpdateNotifSettingsApiParams,
  'updateUserCity': UpdateUserCityApiParams,
  'updateUserProfile': UpdateUserProfileApiParams,
  'user': UserApiParams,
  'userClubsWithPosts': UserClubsWithPostsApiParams,
  'userFollows': UserFollowsApiParams,
  'userFriends': UserFriendsApiParams,
  'userInfo': UserInfoApiParams,
  'userNumMeetups': UserNumMeetupsApiParams,
  'users': UsersApiParams,
  'userView': UserViewApiParams,
  'verifyEmail': VerifyEmailApiParams,
  'verifyResetPassword': VerifyResetPasswordApiParams,
};

type ApiNameToData = {
  'accountStatus': AccountStatusApiData,
  'addMeetupPollOption': null,
  'addToPrivateMessage': null,
  'allUserClubsInfo': null,
  'appleLoginUser': AppleLoginUserApiData,
  'approveMeetupResponse': null,
  'batched': BatchedApiData,
  'blockClub': null,
  'blockUser': null,
  'bulkUploadImages': BulkUploadImagesApiData,
  'checkEntityExists': CheckEntityExistsApiData,
  'city': CityApiData,
  'club': null,
  'clubInvite': ClubInviteApiData,
  'clubs': ClubsApiData,
  'clubsByName': ClubsByNameApiData,
  'clubView': ClubViewApiData,
  'createClub': CreateClubApiData,
  'createClubInvite': CreateClubInviteApiData,
  'createMeetupInvites': null,
  'createMeetupPoll': null,
  'createMeetupResponse': CreateMeetupResponseApiData,
  'createOrEditMeetup': CreateOrEditMeetupApiData,
  'createOrEditPost': CreateOrEditPostApiData,
  'createPrivateMessage': CreatePrivateMessageApiData,
  'createReaction': null,
  'createReply': null,
  'createReport': null,
  'currentUser': CurrentUserApiData,
  'currentUserClubMemberships': CurrentUserClubMembershipsApiData,
  'deleteAccount': null,
  'deleteMeetup': null,
  'deleteMeetupInvites': null,
  'deleteMeetupPollOption': null,
  'deletePost': null,
  'deleteReaction': null,
  'deleteReply': null,
  'editMeetupPoll': null,
  'exchangeInstagramToken': ExchangeInstagramTokenApiData,
  'existingMsgWithUser': ExistingMsgWithUserApiData,
  'favoriteClubs': FavoriteClubsApiData,
  'followUser': null,
  'ftueSeenTime': null,
  'googleLoginUser': GoogleLoginUserApiData,
  'healthchecks': HealthchecksApiData,
  'imagesFromUrl': ImagesFromUrlApiData,
  'importFromInstagram': ImportFromInstagramApiData,
  'joinClub': null,
  'joinClubs': null,
  'leaveClub': null,
  'loginAsUser': LoginAsUserApiData,
  'loginUser': LoginUserApiData,
  'meetupInvitableUsers': MeetupInvitableUsersApiData,
  'meetupInvites': MeetupInvitesApiData,
  'meetupMessageAll': null,
  'meetupPollResponses': MeetupPollResponsesApiData,
  'meetupPolls': null,
  'meetupResponses': MeetupResponsesApiData,
  'meetups': MeetupsApiData,
  'meetupView': MeetupViewApiData,
  'mentionableUsers': MentionableUsersApiData,
  'mutualMeetups': MutualMeetupsApiData,
  'mutualMeetupUsers': MutualMeetupUsersApiData,
  'myClubsRoomsView': MyClubsRoomsViewApiData,
  'myInvitableMeetups': MyInvitableMeetupsApiData,
  'notifs': NotifsApiData,
  'notifSettings': null,
  'onboardCompleteProfile': OnboardCompleteProfileApiData,
  'post': null,
  'postReplyParticipant': null,
  'postReplyThreads': PostReplyThreadsApiData,
  'posts': PostsApiData,
  'privateMessage': null,
  'privateMessages': PrivateMessagesApiData,
  'randomUsers': RandomUsersApiData,
  'reactionCounts': null,
  'reactions': ReactionsApiData,
  'readMeetupDiscussion': null,
  'readNotif': null,
  'readPrivateMessage': null,
  'readRoom': null,
  'recentFollowingPosts': RecentFollowingPostsApiData,
  'regenerateMeetupInviteToken': null,
  'registerPushNotifToken': null,
  'registerUser': RegisterUserApiData,
  'relatedUsers': RelatedUsersApiData,
  'removeFromPrivateMessage': null,
  'repliedRooms': RepliedRoomsApiData,
  'replies': RepliesApiData,
  'reply': null,
  'resetPassword': null,
  'room': null,
  'roomParticipant': null,
  'rooms': RoomsApiData,
  'roomsInClub': null,
  'searchCities': SearchCitiesApiData,
  'seenFtue': null,
  'seenNotifs': null,
  'sendEmailVerification': null,
  'sseOtp': SseOtpApiData,
  'sseSubscribe': null,
  'sseUnsubscribe': null,
  'status': StatusApiData,
  'toggleMeetupPollResponse': ToggleMeetupPollResponseApiData,
  'toggleUnsubEmail': ToggleUnsubEmailApiData,
  'toggleUnsubNotif': null,
  'topLevelClubs': TopLevelClubsApiData,
  'topPostReplies': TopPostRepliesApiData,
  'topUsers': TopUsersApiData,
  'unauthMeetupRegister': null,
  'unauthMeetupVerifyEmail': UnauthMeetupVerifyEmailApiData,
  'unblockClub': null,
  'unblockUser': null,
  'unfollowUser': null,
  'unreadMsgsCount': UnreadMsgsCountApiData,
  'unseenNotifIds': UnseenNotifIdsApiData,
  'unsubNotif': null,
  'updateAccountSettings': UpdateAccountSettingsApiData,
  'updateClubsOrder': null,
  'updateClubVisibility': null,
  'updateNotifSettings': null,
  'updateUserCity': null,
  'updateUserProfile': null,
  'user': null,
  'userClubsWithPosts': UserClubsWithPostsApiData,
  'userFollows': UserFollowsApiData,
  'userFriends': UserFriendsApiData,
  'userInfo': UserInfoApiData,
  'userNumMeetups': UserNumMeetupsApiData,
  'users': UsersApiData,
  'userView': null,
  'verifyEmail': VerifyEmailApiData,
  'verifyResetPassword': VerifyResetPasswordApiData,
};

type ApiName = 'accountStatus'
  | 'addMeetupPollOption'
  | 'addToPrivateMessage'
  | 'allUserClubsInfo'
  | 'appleLoginUser'
  | 'approveMeetupResponse'
  | 'batched'
  | 'blockClub'
  | 'blockUser'
  | 'bulkUploadImages'
  | 'checkEntityExists'
  | 'city'
  | 'club'
  | 'clubInvite'
  | 'clubs'
  | 'clubsByName'
  | 'clubView'
  | 'createClub'
  | 'createClubInvite'
  | 'createMeetupInvites'
  | 'createMeetupPoll'
  | 'createMeetupResponse'
  | 'createOrEditMeetup'
  | 'createOrEditPost'
  | 'createPrivateMessage'
  | 'createReaction'
  | 'createReply'
  | 'createReport'
  | 'currentUser'
  | 'currentUserClubMemberships'
  | 'deleteAccount'
  | 'deleteMeetup'
  | 'deleteMeetupInvites'
  | 'deleteMeetupPollOption'
  | 'deletePost'
  | 'deleteReaction'
  | 'deleteReply'
  | 'editMeetupPoll'
  | 'exchangeInstagramToken'
  | 'existingMsgWithUser'
  | 'favoriteClubs'
  | 'followUser'
  | 'ftueSeenTime'
  | 'googleLoginUser'
  | 'healthchecks'
  | 'imagesFromUrl'
  | 'importFromInstagram'
  | 'joinClub'
  | 'joinClubs'
  | 'leaveClub'
  | 'loginAsUser'
  | 'loginUser'
  | 'meetupInvitableUsers'
  | 'meetupInvites'
  | 'meetupMessageAll'
  | 'meetupPollResponses'
  | 'meetupPolls'
  | 'meetupResponses'
  | 'meetups'
  | 'meetupView'
  | 'mentionableUsers'
  | 'mutualMeetups'
  | 'mutualMeetupUsers'
  | 'myClubsRoomsView'
  | 'myInvitableMeetups'
  | 'notifs'
  | 'notifSettings'
  | 'onboardCompleteProfile'
  | 'post'
  | 'postReplyParticipant'
  | 'postReplyThreads'
  | 'posts'
  | 'privateMessage'
  | 'privateMessages'
  | 'randomUsers'
  | 'reactionCounts'
  | 'reactions'
  | 'readMeetupDiscussion'
  | 'readNotif'
  | 'readPrivateMessage'
  | 'readRoom'
  | 'recentFollowingPosts'
  | 'regenerateMeetupInviteToken'
  | 'registerPushNotifToken'
  | 'registerUser'
  | 'relatedUsers'
  | 'removeFromPrivateMessage'
  | 'repliedRooms'
  | 'replies'
  | 'reply'
  | 'resetPassword'
  | 'room'
  | 'roomParticipant'
  | 'rooms'
  | 'roomsInClub'
  | 'searchCities'
  | 'seenFtue'
  | 'seenNotifs'
  | 'sendEmailVerification'
  | 'sseOtp'
  | 'sseSubscribe'
  | 'sseUnsubscribe'
  | 'status'
  | 'toggleMeetupPollResponse'
  | 'toggleUnsubEmail'
  | 'toggleUnsubNotif'
  | 'topLevelClubs'
  | 'topPostReplies'
  | 'topUsers'
  | 'unauthMeetupRegister'
  | 'unauthMeetupVerifyEmail'
  | 'unblockClub'
  | 'unblockUser'
  | 'unfollowUser'
  | 'unreadMsgsCount'
  | 'unseenNotifIds'
  | 'unsubNotif'
  | 'updateAccountSettings'
  | 'updateClubsOrder'
  | 'updateClubVisibility'
  | 'updateNotifSettings'
  | 'updateUserCity'
  | 'updateUserProfile'
  | 'user'
  | 'userClubsWithPosts'
  | 'userFollows'
  | 'userFriends'
  | 'userInfo'
  | 'userNumMeetups'
  | 'users'
  | 'userView'
  | 'verifyEmail'
  | 'verifyResetPassword';

type AuthApiName = 'accountStatus'
| 'addMeetupPollOption'
| 'addToPrivateMessage'
| 'allUserClubsInfo'
| 'approveMeetupResponse'
| 'blockClub'
| 'blockUser'
| 'bulkUploadImages'
| 'createClub'
| 'createClubInvite'
| 'createMeetupInvites'
| 'createMeetupPoll'
| 'createMeetupResponse'
| 'createOrEditMeetup'
| 'createOrEditPost'
| 'createPrivateMessage'
| 'createReaction'
| 'createReply'
| 'createReport'
| 'currentUser'
| 'currentUserClubMemberships'
| 'deleteAccount'
| 'deleteMeetup'
| 'deleteMeetupInvites'
| 'deleteMeetupPollOption'
| 'deletePost'
| 'deleteReaction'
| 'deleteReply'
| 'editMeetupPoll'
| 'exchangeInstagramToken'
| 'existingMsgWithUser'
| 'followUser'
| 'ftueSeenTime'
| 'imagesFromUrl'
| 'importFromInstagram'
| 'joinClub'
| 'joinClubs'
| 'leaveClub'
| 'loginAsUser'
| 'meetupInvitableUsers'
| 'meetupInvites'
| 'meetupMessageAll'
| 'mentionableUsers'
| 'mutualMeetupUsers'
| 'myInvitableMeetups'
| 'notifs'
| 'notifSettings'
| 'postReplyParticipant'
| 'postReplyThreads'
| 'privateMessage'
| 'privateMessages'
| 'reactionCounts'
| 'reactions'
| 'readMeetupDiscussion'
| 'readNotif'
| 'readPrivateMessage'
| 'readRoom'
| 'regenerateMeetupInviteToken'
| 'registerPushNotifToken'
| 'removeFromPrivateMessage'
| 'repliedRooms'
| 'roomParticipant'
| 'seenFtue'
| 'seenNotifs'
| 'sendEmailVerification'
| 'toggleMeetupPollResponse'
| 'toggleUnsubNotif'
| 'unblockClub'
| 'unblockUser'
| 'unfollowUser'
| 'unreadMsgsCount'
| 'unseenNotifIds'
| 'unsubNotif'
| 'updateAccountSettings'
| 'updateClubsOrder'
| 'updateClubVisibility'
| 'updateNotifSettings'
| 'updateUserCity'
| 'updateUserProfile';
