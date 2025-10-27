// sidebar.js
document.addEventListener('DOMContentLoaded', function() {
    const sidebarPlaceholder = document.getElementById('sidebar-placeholder');
    if (sidebarPlaceholder) {
        // Determine the correct path to sidebar.html based on current page depth
        const pathPrefix = sidebarPlaceholder.getAttribute('data-root-path') || './'; // Default to current dir

        fetch(pathPrefix + 'sidebar.html')
            .then(response => {
                if (!response.ok) {
                    throw new Error('Sidebar not found at ' + pathPrefix + 'sidebar.html');
                }
                return response.text();
            })
            .then(data => {
                sidebarPlaceholder.innerHTML = data;
            })
            .catch(error => {
                console.error('Error loading sidebar:', error);
                sidebarPlaceholder.innerHTML = '<p style="color:red;">Sidebar could not be loaded.</p>';
            });
    } else {
        console.warn('Sidebar placeholder element not found.');
    }
});