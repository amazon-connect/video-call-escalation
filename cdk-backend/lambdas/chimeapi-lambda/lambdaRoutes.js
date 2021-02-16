// Copyright 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

const ErrorHandler = require('./error');
const meetings = require('./meetings');
const getUserFromJWT = require('/opt/utility-handler/httpapi-decode-verify-jwt');


let lambdaRoutesMap = new Map()

/**********************
 * Meeting methods *
 **********************/

//create meeting 
lambdaRoutesMap.set('POST /meeting', async (req)=>{
    const currentUser = await getUser(req);
    const createMeetingResult = await meetings.createMeeting(req.body['meetingTitle'], req.body['meetingRegion'], currentUser.username, req.body['attendeeName'], req.body['attendeeExternalUserId']);
    console.info('Create meeting result: ', createMeetingResult);
    return {body : { success: 'Create meeting succeed!', data: createMeetingResult }}
});

//end meeting for all
lambdaRoutesMap.set('DELETE /meeting', async (req)=>{
    const currentUser = await getUser(req);
    const endMeetingResult = await meetings.endMeetingForAll(req.body['meetingTitle'], currentUser.username);
    console.info('End meeting result: ', endMeetingResult);
    return {body : { success: 'End meeting succeed!', data: endMeetingResult }}
});

/**********************
* Attendee methods *
**********************/

lambdaRoutesMap.set('GET /attendee', async (req)=>{
    const getAttendeeNameResult = await meetings.getAttendeeName(req.queryStringParameters['meetingTitle'], req.queryStringParameters['attendeeExternalUserId']);
    console.info('Get Attendee result: ', getAttendeeNameResult);
    return {body : { success: 'Get Attendee Name succeed!', data: getAttendeeNameResult }}
});

lambdaRoutesMap.set('POST /attendee', async (req)=>{
    const currentUser = await getUser(req);
    const createAttendeeResult = await meetings.createAttendee(req.body['meetingTitle'], currentUser.username, req.body['attendeeExternalUserId'], req.body['attendeeName']);
    console.info('Create attendee result: ', createAttendeeResult);
    return {body : { success: 'Create attendee succeed!', data: createAttendeeResult }}
});

/**********************
* Join Meeting method *
**********************/

lambdaRoutesMap.set('POST /join', async (req)=>{
    const joinMeetingResult = await meetings.joinMeeting(req.body['meetingTitle'], req.body['attendeeExternalUserId']);
    console.info('Join meeting result: ', joinMeetingResult);
    return {body : { success: 'Join meeting succeed!', data: joinMeetingResult }}
});

/**********************
* Helper methods *
**********************/

const getUser = async (req) => {
  const currentUser = await getUserFromJWT(req.requestContext.authorizer, req.headers.cognitoidtoken);
  if (currentUser.isValid) return currentUser;
  throw new ErrorHandler(403, 'CCP Login Error, user not valid');
}

module.exports = (route) => {
  return lambdaRoutesMap.get(route)
}
