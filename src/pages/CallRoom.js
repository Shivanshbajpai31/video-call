import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import io from 'socket.io-client';
import Peer from 'simple-peer';
import {
  Container,
  Typography,
  TextField,
  Button,
  Box,
  Paper,
  IconButton,
  Avatar,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Fab,
  Collapse,
  Snackbar,
} from '@mui/material';
import {
  CallEnd,
  Mic,
  MicOff,
  Videocam,
  VideocamOff,
  Call,
  Chat as ChatIcon,
  AttachFile,
} from '@mui/icons-material';
import { styled } from '@mui/system';

// Update the Socket.io connection URL to your Render backend
const socket = io('https://video-call-2-xl8w.onrender.com'); // Updated Render backend URL

const VideoContainer = styled(Box)({
  position: 'fixed',
  bottom: '20px',
  right: '20px',
  width: '300px',
  height: '200px',
  borderRadius: '10px',
  overflow: 'hidden',
  zIndex: 1000,
});

const ChatContainer = styled(Paper)({
  padding: '10px',
  height: '500px',
  display: 'flex',
  flexDirection: 'column',
  borderRadius: '10px',
});

const MessageList = styled(List)({
  flex: 1,
  overflowY: 'auto',
  marginBottom: '10px',
});

const CallRoom = () => {
  const { roomId: initialRoomId } = useParams(); // Get roomId from URL (if any)
  const [stream, setStream] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOn, setIsVideoOn] = useState(true);
  const [isNormalCall, setIsNormalCall] = useState(false);
  const [showCallTypeDialog, setShowCallTypeDialog] = useState(false);
  const [isCallActive, setIsCallActive] = useState(false);
  const [isChatMinimized, setIsChatMinimized] = useState(false);
  const [callRequest, setCallRequest] = useState(null);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [roomId, setRoomId] = useState(initialRoomId || ''); // Room ID state
  const userVideoRef = useRef();
  const peerVideoRef = useRef();
  const peerRef = useRef();
  const fileInputRef = useRef();

  const createPeer = useCallback(
    (initiator = true) => {
      const peer = new Peer({
        initiator,
        stream,
        config: {
          iceServers: [
            { urls: 'stun:stun.l.google.com:19302' }, // STUN server
          ],
        },
      });

      peer.on('signal', (data) => {
        socket.emit('signal', { roomId, data });
      });

      peer.on('stream', (stream) => {
        if (peerVideoRef.current) {
          peerVideoRef.current.srcObject = stream;
        }
      });

      peerRef.current = peer;
    },
    [stream, roomId]
  );

  const handleCallTypeSelection = useCallback((isNormal) => {
    setIsNormalCall(isNormal);
    setShowCallTypeDialog(false);
    setIsCallActive(true);
    setIsChatMinimized(true); // Minimize chat section when call starts

    const mediaConstraints = isNormal
      ? { audio: true, video: false } // Audio-only for normal call
      : { audio: true, video: true }; // Video call

    navigator.mediaDevices.getUserMedia(mediaConstraints).then((stream) => {
      setStream(stream);
      if (userVideoRef.current) {
        userVideoRef.current.srcObject = stream;
      }
    });

    socket.emit('join-room', roomId); // Join the room

    socket.on('signal', (data) => {
      if (!peerRef.current) {
        createPeer(data);
      } else {
        peerRef.current.signal(data);
      }
    });
  }, [createPeer, roomId]);

  useEffect(() => {
    socket.on('receive-message', (data) => {
      if (data && (data.message || data.media)) {
        setMessages((prev) => [...prev, data]);
      } else {
        console.error('Invalid message received:', data);
      }
    });

    socket.on('receive-call-request', (data) => {
      setCallRequest(data);
      setSnackbarMessage(`Incoming call from ${data.from}`);
      setSnackbarOpen(true);
    });

    socket.on('call-request-accepted', (data) => {
      setSnackbarMessage('Call request accepted');
      setSnackbarOpen(true);
      handleCallTypeSelection(false); // Start video call by default
    });

    socket.on('call-request-rejected', () => {
      setSnackbarMessage('Call request rejected');
      setSnackbarOpen(true);
      setCallRequest(null);
    });

    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
      socket.disconnect();
    };
  }, [stream, handleCallTypeSelection]);

  const startCall = () => {
    if (!roomId) {
      alert('Please enter a Room ID');
      return;
    }
    setShowCallTypeDialog(true);
  };

  const joinRoom = () => {
    if (!roomId) {
      alert('Please enter a Room ID');
      return;
    }
    socket.emit('join-room', roomId); // Join the room
    setIsCallActive(true);
  };

  const sendMessage = () => {
    if (newMessage) {
      const messageData = { roomId, message: newMessage, sender: socket.id };
      socket.emit('send-message', messageData);
      setMessages((prev) => [...prev, messageData]);
      setNewMessage('');
    }
  };

  const sendMedia = (file) => {
    const reader = new FileReader();
    reader.onload = () => {
      const mediaData = {
        roomId,
        media: reader.result,
        sender: socket.id,
        type: file.type.startsWith('image') ? 'image' : 'video',
      };
      socket.emit('send-message', mediaData);
      setMessages((prev) => [...prev, mediaData]);
    };
    reader.readAsDataURL(file);
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.type.startsWith('image/') || file.type.startsWith('video/')) {
        sendMedia(file);
      } else {
        alert('Please upload an image or video file.');
      }
    }
  };

  const endCall = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
    }
    if (peerRef.current) {
      peerRef.current.destroy();
    }
    setIsCallActive(false);
    setIsChatMinimized(false); // Restore chat section when call ends
  };

  const toggleMute = () => {
    if (stream) {
      const audioTrack = stream.getAudioTracks()[0];
      audioTrack.enabled = !audioTrack.enabled;
      setIsMuted(!audioTrack.enabled);
    }
  };

  const toggleVideo = () => {
    if (stream) {
      const videoTrack = stream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoOn(!videoTrack.enabled);
      }
    }
  };

  const toggleChat = () => {
    setIsChatMinimized(!isChatMinimized);
  };

  const handleSnackbarClose = () => {
    setSnackbarOpen(false);
  };

  // Add missing functions
  const acceptCallRequest = () => {
    socket.emit('accept-call-request', { to: callRequest.from, roomId });
    setCallRequest(null);
  };

  const rejectCallRequest = () => {
    socket.emit('reject-call-request', { to: callRequest.from });
    setCallRequest(null);
  };

  return (
    <Container>
      <Dialog open={showCallTypeDialog} onClose={() => setShowCallTypeDialog(false)}>
        <DialogTitle>Choose Call Type</DialogTitle>
        <DialogContent>
          <Typography>Do you want to start a normal call (audio-only) or a video call?</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => handleCallTypeSelection(true)}>Normal Call</Button>
          <Button onClick={() => handleCallTypeSelection(false)}>Video Call</Button>
        </DialogActions>
      </Dialog>

      <Typography variant="h4" align="center" gutterBottom>
        Room: {roomId}
      </Typography>

      <Box display="flex" justifyContent="space-between" mt={3}>
        <Box flex={1} mr={2}>
          <Collapse in={!isChatMinimized}>
            <ChatContainer elevation={3}>
              <Typography variant="h6" gutterBottom>
                Chat
              </Typography>
              <MessageList>
                {messages.map((msg, index) => (
                  <ListItem key={index}>
                    <ListItemAvatar>
                      <Avatar>{msg.sender ? msg.sender[0] : 'U'}</Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={msg.sender || 'Unknown'}
                      secondary={
                        msg.media ? (
                          msg.type === 'image' ? (
                            <img
                              src={msg.media}
                              alt="Shared content"
                              style={{ maxWidth: '100%', borderRadius: '5px' }}
                            />
                          ) : (
                            <video
                              src={msg.media}
                              controls
                              style={{ maxWidth: '100%', borderRadius: '5px' }}
                            />
                          )
                        ) : (
                          msg.message
                        )
                      }
                    />
                  </ListItem>
                ))}
              </MessageList>
              <Box display="flex">
                <TextField
                  fullWidth
                  variant="outlined"
                  placeholder="Type a message"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                />
                <IconButton color="primary" onClick={() => fileInputRef.current.click()}>
                  <AttachFile />
                </IconButton>
                <Button variant="contained" color="primary" onClick={sendMessage} style={{ marginLeft: '10px' }}>
                  Send
                </Button>
              </Box>
              <input
                type="file"
                ref={fileInputRef}
                style={{ display: 'none' }}
                accept="image/*, video/*"
                onChange={handleFileUpload}
              />
            </ChatContainer>
          </Collapse>
        </Box>
      </Box>

      {!isCallActive && (
        <Fab
          color="primary"
          aria-label="call"
          onClick={startCall}
          style={{
            position: 'fixed',
            bottom: '20px',
            right: '20px',
          }}
        >
          <Call />
        </Fab>
      )}

      {isCallActive && !isNormalCall && (
        <VideoContainer>
          <video
            ref={userVideoRef}
            autoPlay
            muted
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
          <video ref={peerVideoRef} autoPlay style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        </VideoContainer>
      )}

      {isCallActive && (
        <Box display="flex" justifyContent="center" gap={2} mb={4}>
          <IconButton color={isMuted ? 'secondary' : 'primary'} onClick={toggleMute}>
            {isMuted ? <MicOff /> : <Mic />}
          </IconButton>
          {!isNormalCall && (
            <IconButton color={isVideoOn ? 'primary' : 'secondary'} onClick={toggleVideo}>
              {isVideoOn ? <Videocam /> : <VideocamOff />}
            </IconButton>
          )}
          <IconButton color="secondary" onClick={endCall}>
            <CallEnd />
          </IconButton>
          <IconButton color="primary" onClick={toggleChat}>
            <ChatIcon />
          </IconButton>
        </Box>
      )}

      <Snackbar
        open={snackbarOpen}
        autoHideDuration={6000}
        onClose={handleSnackbarClose}
        message={snackbarMessage}
        action={
          callRequest && (
            <>
              <Button color="secondary" size="small" onClick={acceptCallRequest}>
                Accept
              </Button>
              <Button color="secondary" size="small" onClick={rejectCallRequest}>
                Reject
              </Button>
            </>
          )
        }
      />
    </Container>
  );
};

export default CallRoom;