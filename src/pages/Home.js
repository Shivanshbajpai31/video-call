import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Container, Typography, TextField, Button, Paper, Box } from '@mui/material';

const Home = () => {
  const [roomId, setRoomId] = useState('');
  const navigate = useNavigate();

  const joinRoom = () => {
    if (roomId) {
      navigate(`/call/${roomId}`);
    }
  };

  return (
    <Container maxWidth="sm" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
      <Paper elevation={3} style={{ padding: '40px', textAlign: 'center', borderRadius: '15px', width: '100%' }}>
        <Typography variant="h4" gutterBottom style={{ fontWeight: 'bold', color: '#1976d2', marginBottom: '20px' }}>
          Needgram
        </Typography>
        <TextField
          fullWidth
          variant="outlined"
          placeholder="Enter Room ID"
          value={roomId}
          onChange={(e) => setRoomId(e.target.value)}
          style={{ marginBottom: '20px' }}
          InputProps={{
            style: {
              borderRadius: '8px',
            }
          }}
        />
        <Button
          variant="contained"
          color="primary"
          onClick={joinRoom}
          style={{ padding: '10px 30px', borderRadius: '8px', fontWeight: 'bold', width: '100%' }}
        >
          Join Room
        </Button>
      </Paper>
    </Container>
  );
};

export default Home;