self.addEventListener('push', function(event) {
  const title = 'Push Notification';
  const options = {
    body: event.data.text()
  };
  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  // Handle the click event (e.g., open a specific URL)
});
