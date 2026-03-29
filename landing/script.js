document.addEventListener('DOMContentLoaded', () => {
    // Smooth scrolling for navigation links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const targetId = this.getAttribute('href');
            const targetElement = document.querySelector(targetId);
            
            if (targetElement) {
                targetElement.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });

    // Reveal hidden sections on scroll
    const revealSections = () => {
        const sections = document.querySelectorAll('.feature-card, .setup-container');
        sections.forEach(section => {
            const sectionTop = section.getBoundingClientRect().top;
            const triggerPoint = window.innerHeight - 150;
            
            if (sectionTop < triggerPoint) {
                section.style.opacity = '1';
                section.style.transform = 'translateY(0)';
            }
        });
    };

    // Initialize display states for hidden elements
    const hiddenElements = document.querySelectorAll('.feature-card, .setup-container');
    hiddenElements.forEach(el => {
        el.style.opacity = '0';
        el.style.transform = 'translateY(30px)';
        el.style.transition = 'opacity 0.8s ease, transform 0.8s ease';
    });

    window.addEventListener('scroll', revealSections);
    revealSections(); // Trigger on initial load

    // Add subtle parallax to hero mockup
    window.addEventListener('mousemove', (e) => {
        const mockup = document.querySelector('.mockup-frame');
        if (!mockup) return;
        
        const moveX = (e.clientX - window.innerWidth / 2) * 0.01;
        const moveY = (e.clientY - window.innerHeight / 2) * 0.01;
        
        mockup.style.transform = `perspective(1000px) rotateX(${5 + moveY}deg) rotateY(${moveX}deg)`;
    });
});
