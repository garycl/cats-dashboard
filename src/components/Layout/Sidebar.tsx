import React from 'react';
import {
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Box,
  Typography,
  Divider,
  IconButton,
  useTheme,
} from '@mui/material';
import {
  Home,
  Dashboard,
  Compare,
  TrendingUp,
  ChevronLeft,
  ChevronRight,
  Flight,
} from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';

interface SidebarProps {
  open: boolean;
  onToggle: () => void;
}

const navigationItems = [
  { text: 'Home', icon: <Home />, path: '/' },
  { text: 'Executive Overview', icon: <Dashboard />, path: '/executive-overview' },
  { text: 'Airport Performance', icon: <Compare />, path: '/airport-comparison' },
  { text: 'Performance Trends', icon: <TrendingUp />, path: '/performance-trends' },
];

const Sidebar: React.FC<SidebarProps> = ({ open, onToggle }) => {
  const theme = useTheme();
  const navigate = useNavigate();
  const location = useLocation();

  const handleNavigation = (path: string) => {
    navigate(path);
  };

  return (
    <Drawer
      variant="permanent"
      sx={{
        width: open ? 240 : 80,
        flexShrink: 0,
        '& .MuiDrawer-paper': {
          width: open ? 240 : 80,
          boxSizing: 'border-box',
          backgroundColor: '#0a1929', // Dark navy (closer to Industry Snapshot text)
          color: 'white',
          transition: 'width 0.3s ease',
          overflowX: 'hidden',
        },
      }}
    >
      {/* Header */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: theme.spacing(2),
          minHeight: 64,
        }}
      >
        {open && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Flight sx={{ fontSize: 28, color: theme.palette.secondary.main }} />
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 700, lineHeight: 1 }}>
                CATS
              </Typography>
              <Typography variant="caption" sx={{ opacity: 0.8, lineHeight: 1 }}>
                Form 127 Analytics
              </Typography>
            </Box>
          </Box>
        )}
        <IconButton onClick={onToggle} sx={{ color: 'white' }}>
          {open ? <ChevronLeft /> : <ChevronRight />}
        </IconButton>
      </Box>

      <Divider sx={{ borderColor: 'rgba(255, 255, 255, 0.12)' }} />

      {/* Navigation */}
      <List sx={{ px: 1, py: 2 }}>
        {navigationItems.map((item) => {
          const isActive = location.pathname === item.path;

          return (
            <ListItem key={item.text} disablePadding sx={{ mb: 1 }}>
              <ListItemButton
                onClick={() => handleNavigation(item.path)}
                sx={{
                  borderRadius: 2,
                  color: 'white',
                  backgroundColor: isActive ? 'rgba(255, 255, 255, 0.1)' : 'transparent',
                  '&:hover': {
                    backgroundColor: 'rgba(255, 255, 255, 0.08)',
                  },
                  minHeight: 48,
                  px: 2,
                }}
              >
                <ListItemIcon
                  sx={{
                    color: isActive ? theme.palette.secondary.main : 'white',
                    minWidth: open ? 40 : 'auto',
                    mr: open ? 0 : 'auto',
                  }}
                >
                  {item.icon}
                </ListItemIcon>
                {open && (
                  <ListItemText
                    primary={item.text}
                    sx={{
                      '& .MuiListItemText-primary': {
                        fontWeight: isActive ? 600 : 400,
                        fontSize: '0.95rem',
                      },
                    }}
                  />
                )}
              </ListItemButton>
            </ListItem>
          );
        })}
      </List>

      {/* Footer */}
      {open && (
        <Box sx={{ mt: 'auto', p: 2 }}>
          <Divider sx={{ borderColor: 'rgba(255, 255, 255, 0.12)', mb: 2 }} />
          <Typography variant="caption" sx={{ opacity: 0.7, display: 'block', mb: 1 }}>
            Executive Intelligence for
          </Typography>
          <Typography variant="caption" sx={{ opacity: 0.7, display: 'block' }}>
            US Airport Financial Performance
          </Typography>
        </Box>
      )}
    </Drawer>
  );
};

export default Sidebar;
