import React, { useMemo } from 'react';
import Map, { Marker, Popup, ViewStateChangeEvent } from 'react-map-gl/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';
import {
  Box,
  Paper,
  Typography,
  useTheme,
  Chip,
} from '@mui/material';
import {
  Flight,
  Place,
} from '@mui/icons-material';
import { AirportData } from '../../context/DataContext';

// Comprehensive basemap options - all free, no API keys required
const BASEMAP_STYLES = {
  // CartoDB Positron - Clean, minimal light theme (RECOMMENDED)
  positron: {
    version: 8 as const,
    name: 'Clean Light',
    sources: {
      'positron-tiles': {
        type: 'raster' as const,
        tiles: ['https://cartodb-basemaps-a.global.ssl.fastly.net/light_all/{z}/{x}/{y}.png'],
        tileSize: 256,
        attribution: '© CartoDB, © OpenStreetMap contributors'
      }
    },
    layers: [{ id: 'positron-tiles', type: 'raster' as const, source: 'positron-tiles' }]
  },

  // CartoDB Voyager - Balanced detail and readability
  voyager: {
    version: 8 as const,
    name: 'Voyager',
    sources: {
      'voyager-tiles': {
        type: 'raster' as const,
        tiles: ['https://cartodb-basemaps-a.global.ssl.fastly.net/rastertiles/voyager/{z}/{x}/{y}.png'],
        tileSize: 256,
        attribution: '© CartoDB, © OpenStreetMap contributors'
      }
    },
    layers: [{ id: 'voyager-tiles', type: 'raster' as const, source: 'voyager-tiles' }]
  },

  // OpenStreetMap - Classic detailed map
  osm: {
    version: 8 as const,
    name: 'OpenStreetMap',
    sources: {
      'osm-tiles': {
        type: 'raster' as const,
        tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
        tileSize: 256,
        attribution: '© OpenStreetMap contributors'
      }
    },
    layers: [{ id: 'osm-tiles', type: 'raster' as const, source: 'osm-tiles' }]
  },

  // Stamen Toner - High contrast black and white
  toner: {
    version: 8 as const,
    name: 'High Contrast',
    sources: {
      'toner-tiles': {
        type: 'raster' as const,
        tiles: ['https://stamen-tiles.a.ssl.fastly.net/toner/{z}/{x}/{y}.png'],
        tileSize: 256,
        attribution: '© Stamen Design, © OpenStreetMap contributors'
      }
    },
    layers: [{ id: 'toner-tiles', type: 'raster' as const, source: 'toner-tiles' }]
  },

  // Stamen Terrain - Physical features
  terrain: {
    version: 8 as const,
    name: 'Terrain',
    sources: {
      'terrain-tiles': {
        type: 'raster' as const,
        tiles: ['https://stamen-tiles.a.ssl.fastly.net/terrain/{z}/{x}/{y}.jpg'],
        tileSize: 256,
        attribution: '© Stamen Design, © OpenStreetMap contributors'
      }
    },
    layers: [{ id: 'terrain-tiles', type: 'raster' as const, source: 'terrain-tiles' }]
  },

  // CartoDB Dark Matter - Dark theme
  dark: {
    version: 8 as const,
    name: 'Dark Theme',
    sources: {
      'dark-tiles': {
        type: 'raster' as const,
        tiles: ['https://cartodb-basemaps-a.global.ssl.fastly.net/dark_all/{z}/{x}/{y}.png'],
        tileSize: 256,
        attribution: '© CartoDB, © OpenStreetMap contributors'
      }
    },
    layers: [{ id: 'dark-tiles', type: 'raster' as const, source: 'dark-tiles' }]
  },

  // ESRI World Imagery - Satellite view
  satellite: {
    version: 8 as const,
    name: 'Satellite',
    sources: {
      'satellite-tiles': {
        type: 'raster' as const,
        tiles: ['https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'],
        tileSize: 256,
        attribution: '© Esri, Maxar, Earthstar Geographics'
      }
    },
    layers: [{ id: 'satellite-tiles', type: 'raster' as const, source: 'satellite-tiles' }]
  },

  // OpenTopoMap - Topographic style
  topo: {
    version: 8 as const,
    name: 'Topographic',
    sources: {
      'topo-tiles': {
        type: 'raster' as const,
        tiles: ['https://tile.opentopomap.org/{z}/{x}/{y}.png'],
        tileSize: 256,
        attribution: '© OpenTopoMap contributors'
      }
    },
    layers: [{ id: 'topo-tiles', type: 'raster' as const, source: 'topo-tiles' }]
  },

  // ESRI World Street Map - Clean street view
  streets: {
    version: 8 as const,
    name: 'Street Map',
    sources: {
      'streets-tiles': {
        type: 'raster' as const,
        tiles: ['https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}'],
        tileSize: 256,
        attribution: '© Esri, DeLorme, NAVTEQ'
      }
    },
    layers: [{ id: 'streets-tiles', type: 'raster' as const, source: 'streets-tiles' }]
  },

  // Stamen Watercolor - Artistic style (lower zoom levels only)
  watercolor: {
    version: 8 as const,
    name: 'Watercolor Art',
    sources: {
      'watercolor-tiles': {
        type: 'raster' as const,
        tiles: ['https://stamen-tiles.a.ssl.fastly.net/watercolor/{z}/{x}/{y}.jpg'],
        tileSize: 256,
        attribution: '© Stamen Design, © OpenStreetMap contributors'
      }
    },
    layers: [{ id: 'watercolor-tiles', type: 'raster' as const, source: 'watercolor-tiles' }]
  }
};

// Use clean Positron style for better contrast with airport markers
const DEFAULT_STYLE = BASEMAP_STYLES.positron;

interface CoverageMapProps {
  airports: AirportData[];
  height?: number | string;
}

// Colorblind-friendly color scheme using viridis-inspired colors with transparency
const hubColors = {
  L: '#440154',    // Large - Deep Purple (most distinctive)
  M: '#3b528b',    // Medium - Dark Blue
  S: '#21908c',    // Small - Teal
  N: '#5dc863',    // Non-Hub - Green (easy to distinguish)
  default: '#fde725' // Default - Yellow
} as const;

// Smaller marker sizes for better visibility at zoomed out view
const hubSizes = {
  L: 14,   // Large Hub (reduced from 20)
  M: 11,   // Medium Hub (reduced from 16)
  S: 8,    // Small Hub (reduced from 12)
  N: 4,    // Non-Hub (reduced from 6, much smaller)
  default: 7
} as const;

const CoverageMap: React.FC<CoverageMapProps> = ({ airports, height = 400 }) => {
  const theme = useTheme();
  const [popupInfo, setPopupInfo] = React.useState<AirportData | null>(null);

  const [viewState, setViewState] = React.useState({
    longitude: -100.0, // Shifted slightly west to better center AK/HI
    latitude: 40.0,    // Shifted slightly north for better US coverage
    zoom: 2.8,         // Zoomed out further to ensure AK/HI visibility
    pitch: 0,
    bearing: 0
  });

  // Get unique airports (latest year data only) and filter out any without coordinates
  const uniqueAirports = useMemo(() => {
    const latestYear = Math.max(...airports.map(a => a.fiscalYear));
    return airports
      .filter(a => a.fiscalYear === latestYear && a.latitude && a.longitude)
      .reduce((acc, current) => {
        const existing = acc.find(a => a.locId === current.locId);
        if (!existing) {
          acc.push(current);
        }
        return acc;
      }, [] as AirportData[]);
  }, [airports]);

  const getHubSizeLabel = (hubSize: string): string => {
    switch (hubSize) {
      case 'L': return 'Large Hub';
      case 'M': return 'Medium Hub';
      case 'S': return 'Small Hub';
      case 'N': return 'Non-Hub';
      default: return 'Unknown';
    }
  };

  const getHubSizeColor = (hubSize: string): string => {
    return hubColors[hubSize as keyof typeof hubColors] || hubColors.default;
  };

  const getHubSizeMarkerSize = (hubSize: string): number => {
    return hubSizes[hubSize as keyof typeof hubSizes] || hubSizes.default;
  };

  // Count airports by hub size for legend
  const hubCounts = useMemo(() => {
    const counts = { L: 0, M: 0, S: 0, N: 0 };
    uniqueAirports.forEach(airport => {
      const hubSize = airport.hubSize as keyof typeof counts;
      if (hubSize in counts) {
        counts[hubSize]++;
      }
    });
    return counts;
  }, [uniqueAirports]);

  return (
    <Box sx={{ height, width: '100%', borderRadius: 2, overflow: 'hidden', position: 'relative' }}>
      <Map
        {...viewState}
        onMove={(evt: ViewStateChangeEvent) => setViewState(evt.viewState)}
        onClick={() => setPopupInfo(null)}
        style={{ width: '100%', height: '100%' }}
        mapStyle={DEFAULT_STYLE}
        interactive={true}
        attributionControl={false}
      >
        {/* Legend */}
        <Box sx={{ position: 'absolute', bottom: 16, left: 16, zIndex: 5 }}>
          <Paper sx={{ p: 2, borderRadius: 2, boxShadow: '0 8px 20px rgba(0,0,0,0.12)', minWidth: 200 }}>
            <Typography variant="caption" sx={{ fontWeight: 600, letterSpacing: 0.5, color: 'text.secondary', mb: 1, display: 'block' }}>
              Airport Coverage by Hub Size
            </Typography>
            {Object.entries(hubCounts).map(([hubSize, count]) => (
              <Box key={hubSize} sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                <Box
                  sx={{
                    width: getHubSizeMarkerSize(hubSize),
                    height: getHubSizeMarkerSize(hubSize),
                    borderRadius: '50%',
                    backgroundColor: getHubSizeColor(hubSize),
                    border: `1px solid ${getHubSizeColor(hubSize)}`,
                    flexShrink: 0
                  }}
                />
                <Typography variant="body2" sx={{ fontSize: '0.75rem' }}>
                  {getHubSizeLabel(hubSize)}: {count}
                </Typography>
              </Box>
            ))}
            <Typography variant="caption" sx={{ color: 'text.secondary', mt: 1, display: 'block' }}>
              Total: {uniqueAirports.length} airports
            </Typography>
          </Paper>
        </Box>

        {/* Airport Markers */}
        {uniqueAirports.map((airport) => {
          const hubSize = airport.hubSize;
          const markerSize = getHubSizeMarkerSize(hubSize);
          const markerColor = getHubSizeColor(hubSize);

          return (
            <Marker
              key={airport.locId}
              longitude={airport.longitude}
              latitude={airport.latitude}
              anchor="center"
              onClick={(e) => {
                e.originalEvent?.stopPropagation();
                setPopupInfo(airport);
              }}
            >
              <Box
                sx={{
                  width: markerSize,
                  height: markerSize,
                  borderRadius: '50%',
                  backgroundColor: `${markerColor}CC`, // 80% opacity (CC = 204/255)
                  border: `1.5px solid ${markerColor}`,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  '&:hover': {
                    transform: 'scale(2.0)',
                    backgroundColor: `${markerColor}FF`, // Full opacity on hover
                    boxShadow: `0 6px 16px rgba(0,0,0,0.4)`,
                    zIndex: 10
                  },
                  boxShadow: `0 2px 6px rgba(0,0,0,0.2)`,
                  opacity: 0.9,
                }}
                title={`${airport.locId} - ${airport.airportName} (${getHubSizeLabel(hubSize)})`}
              />
            </Marker>
          );
        })}

        {/* Popup for selected airport */}
        {popupInfo && (
          <Popup
            anchor="top"
            longitude={popupInfo.longitude}
            latitude={popupInfo.latitude}
            onClose={() => setPopupInfo(null)}
            closeButton
            closeOnClick={false}
            maxWidth="280px"
          >
            <Paper sx={{ p: 2, minWidth: 240 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                <Flight sx={{ color: theme.palette.primary.main }} fontSize="small" />
                <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                  {popupInfo.locId}
                </Typography>
                <Chip
                  label={getHubSizeLabel(popupInfo.hubSize)}
                  size="small"
                  sx={{
                    backgroundColor: `${getHubSizeColor(popupInfo.hubSize)}20`,
                    color: getHubSizeColor(popupInfo.hubSize),
                    fontWeight: 600,
                    fontSize: '0.7rem'
                  }}
                />
              </Box>

              <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
                {popupInfo.airportName}
              </Typography>

              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                <Place fontSize="small" color="action" />
                <Typography variant="body2" color="text.secondary">
                  {popupInfo.city}, {popupInfo.state}
                </Typography>
              </Box>

            </Paper>
          </Popup>
        )}
      </Map>
    </Box>
  );
};

export default CoverageMap;