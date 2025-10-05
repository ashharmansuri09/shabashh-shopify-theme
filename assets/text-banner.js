let tl = gsap.timeline();

tl.from('.header__heading',{
    y:-40,
    opacity: 0,
    duration: .5,
    delay: .5,
})

tl.from('.list-menu li',{
    y:-30,
    opacity: 0,
    duration: .5,
    stagger: 0.4
});

tl.from('.header__icons',{
    x:30,
    opacity: 0,
    duration: .5,
    stagger: 0.4
})

gsap.to('#text-banner h2',{
    transform: 'translateX(-60%)',
    scrollTrigger: {
        trigger: '#text-banner',
        scroller: 'body',
        markers: true,
        start:'top 0%',
        end:'top -120%',
        scrub: 2,
        pin: true,
    }
})