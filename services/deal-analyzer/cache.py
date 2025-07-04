import time
from threading import Lock

class SimpleCache:
    def __init__(self, ttl=600):
        self.ttl = ttl
        self.data = {}
        self.lock = Lock()

    def get(self, key):
        with self.lock:
            entry = self.data.get(key)
            if entry and (time.time() - entry['time'] < self.ttl):
                return entry['value']
            if key in self.data:
                del self.data[key]
            return None

    def set(self, key, value):
        with self.lock:
            self.data[key] = {'value': value, 'time': time.time()} 