window.scrollTo = (target)=>{
    document.querySelector(target).scrollIntoView({ 
      behavior: 'smooth'
    });
}

window.visibleBody = ()=>{document.querySelector("body").setAttribute("style","");}

window.startTime = 0;

window.loadScripts = (array)=>{
    if(array.length) {
        var script = document.createElement("script");
        script.setAttribute('src',array.shift());
        if(array.length>0)  {
            script.onload = function(){window.loadScripts(array);}.bind({array:array})
        } else {
            script.onload = function(){
                window.loadScripts(array);
                if(window.location.href.indexOf('localhost') > -1) console.log(new Date().getTime() - window.startTime + 'ms elapsed')
            }.bind({array:array})
        }
        document.head.appendChild(script);
    }
}

window.loadApp = (context)=>{
    window.verifiedUser = false;
    if(window.location.href.indexOf('verified=yes')>-1) window.verifiedUser = "yes";
    if(window.location.href.indexOf('verified=no')>-1) window.verifiedUser = "no"; 
    if(window.location.href.indexOf('email=')>-1 && window.verifiedUser == 'yes') {
        console.log(window.location)
        let urlArr = window.location.href.split('email=');
        window.verifiedEmail = urlArr.pop();
    }
    window.location.hash = "/app";
    window.onboardIntent = context;
    document.querySelector("body").setAttribute("style","opacity:0;pointer-events:none;overflow:hidden; max-height:0px;");
    document.querySelector("#loginbutton").setAttribute('onclick','');
    document.querySelector("#registerbutton").setAttribute('onclick','');
    window.startTime = new Date().getTime();
    window.loadScripts([
        "/js/vue.js",
        "https://cdnjs.cloudflare.com/ajax/libs/axios/0.19.2/axios.min.js",
        "https://unpkg.com/http-vue-loader@1.4.1/src/httpVueLoader.js",
        "/ui/main.js"
    ]);
}

window.addEventListener("load", function(event) {
    if(window.location.hash.indexOf('app') > -1) {
        loadApp();
    } else {
        //Not trying to access app yet
        document.querySelector("#loginbutton").setAttribute('onclick','loadApp("login")');
        document.querySelector("#registerbutton").setAttribute('onclick','loadApp("register")');
        visibleBody();
    }
});