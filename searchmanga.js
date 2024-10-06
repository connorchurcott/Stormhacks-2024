document.addEventListener('DOMContentLoaded', () => {
    const searchForm = document.getElementById('searchForm');
    const mangaInfoContainer = document.getElementById('mangaInfoContainer');

    searchForm.addEventListener('submit', async (event) => {
        event.preventDefault(); // Prevent default form submission

        const searchQuery = document.getElementById('searchQuery').value;

        try {
            const response = await fetch('/getMangaInfo', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ searchQuery }),
            });

            const data = await response.json();
            const mangaInfo = data.mangaInfo;
            const filePath = data.filePath;

            if (mangaInfo) {
                mangaInfoContainer.innerHTML = `
                    <h2>${mangaInfo.title.english || mangaInfo.title.romaji}</h2>
                    <img src="${mangaInfo.coverImage.large}" alt="Manga Cover" />
                    <p><strong>Description:</strong> ${mangaInfo.description || 'No description available.'}</p>
                    <p><strong>Chapters:</strong> ${mangaInfo.chapters || 'N/A'}</p>
                    <p><strong>Volumes:</strong> ${mangaInfo.volumes || 'N/A'}</p>
                    <p><strong>Genres:</strong> ${mangaInfo.genres.join(', ') || 'No genres available.'}</p>
                    <p><strong>Status:</strong> ${mangaInfo.status || 'Unknown'}</p>
                    <p><strong>Start Date:</strong> ${mangaInfo.startDate.year}-${mangaInfo.startDate.month || 'N/A'}-${mangaInfo.startDate.day || 'N/A'}</p>
                    <a href="${filePath}" download>Download Manga Info JSON</a>
                `;
            } else {
                mangaInfoContainer.innerHTML = `<p>No manga information found for "${searchQuery}".</p>`;
            }
        } catch (error) {
            console.error('Error fetching manga information:', error);
            mangaInfoContainer.innerHTML = `<p>Error fetching manga information. Please try again later.</p>`;
        }
    });
});
