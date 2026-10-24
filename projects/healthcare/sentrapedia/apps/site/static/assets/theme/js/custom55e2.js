jQuery(document).ready(function ($) {

    $('#mobile-menu-open').click(function (e) {
        e.preventDefault();
        $(this).toggleClass('active');
        $('body').toggleClass('menu-open');
    });

    $('#mobile-menu .menu-item-has-children > a').click(function (e) {
        e.preventDefault();
        $(this).parent().toggleClass('active');
        $(this).next().slideToggle();
    });

    $('#postsGrid').on('click', '.post-card', function (e) {
        window.location.href = $(this).data('href');
    });

    $('.featured-post').on('click', function (e) {
        window.location.href = $(this).find('a').attr('href');
    });

    $('#projectsMobileFilter').on('change', function(e) {
        e.preventDefault();
        var selectedUrl = $(this).val();
        if (selectedUrl) {
            window.location.href = selectedUrl;
        }
    });

    $('.about-boxes .readmore').click(function (e) {
        e.preventDefault();
        var $btn = $(this);
        var $box = $btn.closest('.about-box');
        $box.toggleClass('is-expanded');
        $btn.text($box.hasClass('is-expanded') ? $btn.data('less') : $btn.data('more'));
    });
    

    var $slider = $('.slide-container');

    if ($slider.length) {

        // init postavlja pocetni active, beforeChange menja u trenutku promene
        $slider.on('init', function (event, slick) {
            $('.slide-nav .slide-nav-item').removeClass('active').eq(0).addClass('active');
        });

        $slider.on('beforeChange', function (event, slick, currentSlide, nextSlide) {
            $('.slide-nav .slide-nav-item').removeClass('active').eq(nextSlide).addClass('active');
        });

        $slider.slick({
            fade: true,
            arrows: false,
            dots: false,
            infinite: true,
            speed: 600,
            autoplay: true,
            autoplaySpeed: 4000,
            pauseOnHover: true,
        });

        $('.slide-nav').on('click', '.slide-nav-item', function () {
            $slider.slick('slickGoTo', $(this).index());
        });
    }


    // Load more posts
    $(document).on('click', '.load-more-posts', function (e) {
        e.preventDefault();

        var $btn = $(this);
        var page = parseInt($btn.data('page'));
        var exclude = parseInt($btn.data('exclude'));

        $btn.addClass('loading');

        $.ajax({
            url: ajaxurl,
            type: 'POST',
            data: {
                action: 'sentrapedia_load_more_posts',
                page: page,
                exclude: exclude,
            },
            success: function (response) {
                if (response.html) {
                    $('#postsGrid').append(response.html);
                }
                if (response.has_more) {
                    $btn.data('page', page + 1).removeClass('loading');
                } else {
                    $btn.hide();
                }
            },
            error: function () {
                $btn.removeClass('loading');
            }
        });
    });

    // Load more projects
    $(document).on('click', '#projects-load-more-btn', function (e) {
        e.preventDefault();

        var $btn = $(this);
        var paged = parseInt($btn.data('paged'));
        var termId = $btn.data('term-id');
        var termSlug = $btn.data('term-slug');

        $btn.addClass('loading');

        $.ajax({
            url: ajaxurl,
            type: 'POST',
            data: {
                action: 'projects_load_more',
                paged: paged,
                term_id: termId,
                term_slug: termSlug,
            },
            success: function (response) {
                if (response.success) {
                    $('#projectsRow').append(response.data.html);
                    if (response.data.has_more) {
                        $btn.data('paged', paged + 1).removeClass('loading');
                    } else {
                        $btn.hide();
                    }
                } else {
                    $btn.hide();
                }
            },
            error: function () {
                $btn.removeClass('loading');
            }
        });
    });


    $('#projectCards').on('click', function (e) {
        const $card = $(e.target).closest('.proj-card');

        if (!$card.length || $card.hasClass('is-open')) {
            return;
        }

        $(this).find('.proj-card').removeClass('is-open');
        $card.addClass('is-open');
    });

    $(window).on('scroll', function () {
        if ($(window).scrollTop() > 50) {
            $('#header').addClass('scrolled');
        } else {
            $('#header').removeClass('scrolled');
        }
    });

});