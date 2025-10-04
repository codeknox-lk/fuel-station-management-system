#!/usr/bin/env python3
"""
Simple Python backend for Fuel Station Management System
Provides basic API endpoints with CORS support
"""

import json
import datetime
from http.server import HTTPServer, BaseHTTPRequestHandler
from urllib.parse import urlparse, parse_qs
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Mock data
STATIONS = [
    {
        "id": "1",
        "name": "Colombo Central Station",
        "address": "123 Galle Road, Colombo 03",
        "city": "Colombo",
        "is_active": True,
        "created_at": "2024-01-01T00:00:00Z",
        "updated_at": "2024-01-01T00:00:00Z"
    },
    {
        "id": "2",
        "name": "Kandy Hill Station",
        "address": "456 Peradeniya Road, Kandy",
        "city": "Kandy",
        "is_active": True,
        "created_at": "2024-01-01T00:00:00Z",
        "updated_at": "2024-01-01T00:00:00Z"
    },
    {
        "id": "3",
        "name": "Galle Fort Station",
        "address": "789 Matara Road, Galle",
        "city": "Galle",
        "is_active": False,
        "created_at": "2024-01-01T00:00:00Z",
        "updated_at": "2024-01-01T00:00:00Z"
    }
]

SHIFTS = [
    {
        "id": "1",
        "station_id": "1",
        "template_id": "1",
        "start_time": "2024-10-04T06:00:00Z",
        "end_time": None,
        "status": "OPEN",
        "opened_by": "user1"
    },
    {
        "id": "2",
        "station_id": "2",
        "template_id": "1",
        "start_time": "2024-10-04T06:30:00Z",
        "end_time": "2024-10-04T14:30:00Z",
        "status": "CLOSED",
        "opened_by": "user2",
        "closed_by": "user2"
    },
    {
        "id": "3",
        "station_id": "1",
        "template_id": "2",
        "start_time": "2024-10-04T14:00:00Z",
        "end_time": None,
        "status": "OPEN",
        "opened_by": "user3"
    },
    {
        "id": "4",
        "station_id": "2",
        "template_id": "1",
        "start_time": "2024-10-04T14:30:00Z",
        "end_time": None,
        "status": "OPEN",
        "opened_by": "user4"
    }
]

class CORSRequestHandler(BaseHTTPRequestHandler):
    def _send_cors_headers(self):
        """Send CORS headers"""
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        self.send_header('Access-Control-Max-Age', '3600')

    def _send_json(self, data, status=200):
        """Send JSON response"""
        self.send_response(status)
        self.send_header('Content-Type', 'application/json')
        self._send_cors_headers()
        self.end_headers()
        self.wfile.write(json.dumps(data).encode('utf-8'))

    def do_OPTIONS(self):
        """Handle preflight requests"""
        self._send_cors_headers()
        self.end_headers()

    def do_GET(self):
        """Handle GET requests"""
        try:
            parsed_path = urlparse(self.path)
            path = parsed_path.path
            query_params = parse_qs(parsed_path.query)

            logger.info(f"GET {path} with params: {query_params}")

            if path == '/health':
                self._send_json({"status": "healthy", "timestamp": datetime.datetime.now(datetime.UTC).isoformat()})
            
            elif path == '/api/stations':
                # Filter by active if requested
                stations = STATIONS
                if query_params.get('active') == ['true']:
                    stations = [s for s in STATIONS if s['is_active']]
                self._send_json(stations)
            
            elif path == '/api/shifts':
                # Filter by station if requested
                shifts = SHIFTS
                if 'stationId' in query_params:
                    station_id = query_params['stationId'][0]
                    shifts = [s for s in SHIFTS if s['station_id'] == station_id]
                self._send_json(shifts)
            
            elif path == '/api/audit-log':
                # Mock audit log data
                audit_log = [
                    {
                        "id": "1",
                        "userName": "John Manager",
                        "userRole": "MANAGER",
                        "action": "CREATE",
                        "entity": "SHIFT",
                        "details": "Opened morning shift for Colombo Central Station",
                        "timestamp": "2024-10-04T06:00:00Z",
                        "stationId": "1",
                        "stationName": "Colombo Central Station"
                    },
                    {
                        "id": "2",
                        "userName": "Sarah Accounts",
                        "userRole": "ACCOUNTS",
                        "action": "UPDATE",
                        "entity": "POS_BATCH",
                        "details": "Reconciled POS batch for Kandy Hill Station",
                        "timestamp": "2024-10-04T05:30:00Z",
                        "stationId": "2",
                        "stationName": "Kandy Hill Station"
                    },
                    {
                        "id": "3",
                        "userName": "Mike Owner",
                        "userRole": "OWNER",
                        "action": "CREATE",
                        "entity": "TANK_DIP",
                        "details": "Recorded tank dip for Colombo Central Station",
                        "timestamp": "2024-10-04T07:15:00Z",
                        "stationId": "1",
                        "stationName": "Colombo Central Station"
                    }
                ]
                
                # Filter by station if requested
                if 'stationId' in query_params:
                    station_id = query_params['stationId'][0]
                    audit_log = [a for a in audit_log if a.get('stationId') == station_id]
                
                # Limit results if requested
                if 'limit' in query_params:
                    limit = int(query_params['limit'][0])
                    audit_log = audit_log[:limit]
                
                self._send_json(audit_log)
            
            elif path == '/api/dashboard/stats':
                # Mock dashboard stats
                station_id = query_params.get('stationId', [None])[0]
                
                if station_id:
                    # Station-specific stats
                    stats = {
                        "today_sales": 1250000,
                        "active_shifts": 1,
                        "tank_levels": 85,
                        "pos_transactions": 156,
                        "station_name": next((s['name'] for s in STATIONS if s['id'] == station_id), 'Unknown Station')
                    }
                else:
                    # All stations combined stats
                    stats = {
                        "today_sales": 2500000,
                        "active_shifts": 3,
                        "tank_levels": 85,
                        "pos_transactions": 312,
                        "station_name": "All Stations"
                    }
                
                self._send_json(stats)
            
            else:
                self._send_json({"error": "Not found"}, 404)
        
        except Exception as e:
            logger.error(f"Error handling GET request: {e}")
            self._send_json({"error": "Internal server error"}, 500)

    def do_POST(self):
        """Handle POST requests"""
        try:
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)
            data = json.loads(post_data.decode('utf-8'))
            
            parsed_path = urlparse(self.path)
            path = parsed_path.path
            
            logger.info(f"POST {path} with data: {data}")
            
            if path == '/api/stations':
                # Add new station
                new_station = {
                    "id": str(len(STATIONS) + 1),
                    "name": data.get('name', ''),
                    "address": data.get('address', ''),
                    "city": data.get('city', ''),
                    "is_active": data.get('isActive', True),
                    "created_at": datetime.datetime.now(datetime.UTC).isoformat(),
                    "updated_at": datetime.datetime.now(datetime.UTC).isoformat()
                }
                STATIONS.append(new_station)
                self._send_json(new_station, 201)
            
            else:
                self._send_json({"error": "Not found"}, 404)
        
        except Exception as e:
            logger.error(f"Error handling POST request: {e}")
            self._send_json({"error": "Internal server error"}, 500)

    def log_message(self, format, *args):
        """Override to use our logger"""
        logger.info(f"{self.address_string()} - {format % args}")

def run_server(port=8000):
    """Run the HTTP server"""
    server_address = ('', port)
    httpd = HTTPServer(server_address, CORSRequestHandler)
    logger.info(f"Starting server on port {port}")
    logger.info(f"Health check: http://localhost:{port}/health")
    logger.info(f"Stations API: http://localhost:{port}/api/stations")
    logger.info(f"Shifts API: http://localhost:{port}/api/shifts")
    logger.info(f"Audit Log API: http://localhost:{port}/api/audit-log")
    
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        logger.info("Server stopped")
        httpd.shutdown()

if __name__ == '__main__':
    run_server()
