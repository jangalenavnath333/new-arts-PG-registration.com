// Landing page animations and particle background
document.addEventListener('DOMContentLoaded', () => {
  // Generate animated particles
  const bg = document.getElementById('bgParticles');
  if (bg) {
    for (let i = 0; i < 20; i++) {
      const p = document.createElement('div');
      p.style.cssText = `
        position: absolute;
        width: ${Math.random() * 3 + 1}px;
        height: ${Math.random() * 3 + 1}px;
        background: rgba(99,102,241,${Math.random() * 0.4 + 0.1});
        border-radius: 50%;
        top: ${Math.random() * 100}%;
        left: ${Math.random() * 100}%;
        animation: particleFloat ${Math.random() * 8 + 6}s ease-in-out infinite;
        animation-delay: ${Math.random() * 4}s;
      `;
      bg.appendChild(p);
    }
  }

  // Intersection observer for scroll animations
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.style.opacity = '1';
        entry.target.style.transform = 'translateY(0)';
      }
    });
  }, { threshold: 0.1 });

  document.querySelectorAll('.feature-card, .step, .stat-widget').forEach(el => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(20px)';
    el.style.transition = 'all 0.6s ease';
    observer.observe(el);
  });

  // Navbar scroll effect
  window.addEventListener('scroll', () => {
    const nav = document.getElementById('navbar');
    if (nav) {
      if (window.scrollY > 50) {
        nav.style.padding = '10px 0';
      } else {
        nav.style.padding = '16px 0';
      }
    }
  });
});

// Add particle float animation
const style = document.createElement('style');
style.textContent = `
  @keyframes particleFloat {
    0%, 100% { transform: translate(0, 0) scale(1); opacity: 0.3; }
    33% { transform: translate(${Math.random()*30-15}px, -30px) scale(1.2); opacity: 0.6; }
    66% { transform: translate(${Math.random()*30-15}px, 15px) scale(0.8); opacity: 0.4; }
  }
`;
document.head.appendChild(style);
