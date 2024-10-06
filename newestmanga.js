document.addEventListener('DOMContentLoaded', async () => {
    const newestMangaContainer = document.getElementById('newestMangaContainer');

    try {
        const response = await fetch('/getNewestManga', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error('Failed to fetch the newest manga');
        }

        const data = await response.json();

        if (!data.mangaList || data.mangaList.length === 0) {
            newestMangaContainer.innerHTML = "<p>No newest manga found.</p>";
            return;
        }

        // Dynamically add each manga to the container
        data.mangaList.forEach(manga => {
            const mangaElement = document.createElement('div');
            mangaElement.classList.add('manga-item');

            mangaElement.innerHTML = `
                <h2>${manga.title.romaji} (${manga.title.english || 'No English title'})</h2>
                <img src="${manga.coverImage.large}" alt="${manga.title.romaji} cover">
                <p>${manga.description ? manga.description.substring(0, 150) + '...' : 'No description available.'}</p>
                <p><strong>Genres:</strong> ${manga.genres.join(', ')}</p>
                <p><strong>Chapters:</strong> ${manga.chapters || 'N/A'}</p>
                <p><strong>Volumes:</strong> ${manga.volumes || 'N/A'}</p>
                <p><strong>Start Date:</strong> ${manga.startDate.year}-${manga.startDate.month}-${manga.startDate.day}</p>
            `;

            newestMangaContainer.appendChild(mangaElement);
        });
    } catch (error) {
        console.error('Error loading newest manga:', error);
        newestMangaContainer.innerHTML = "<p>Error loading newest manga.</p>";
    }
});
