//log startup time
var sttime = new Date().getTime()

//Dependencies
require('dotenv').config()
const discord = require('discord.js')
const axios = require('axios').default

//some global vars I need
var petro_active
var bot_active
var mchannel
//Efficieny!
var pclient 
const readline = require('readline').createInterface({
    input: process.stdin,
    output: process.stdout
})


var sFieldEmbed = {
  
    "embed": {
      "color": "",
      "fields": [
        {
          "name": "",
          "value": ""
        }
      ],
      timestamp: new Date(),
      footer: {
          text: 'Mashiro v1.4 • Hit !ip for the server ip',
      },
    }
  }

const targetembed = {}
  


//generic request format
const pRequest = axios.create({
    timeout: 2000,
    headers:{
        'Accept':'application/json',
        'Content-Type':'application/json',
        'Authorization':'Bearer '+process.env.PETRO_KEY
    }
})




//create discord client instance
const bot = new discord.Client()



//discord login!
bot.login(process.env.DISCORD_BOT_TOKEN)

//status command (~status) request handler
//IMPORTANT : This function's parameter 'msg' is the channel inwhich the message needs to be sent, not the message object itself
async function stCommand(mschannel){
    try{
    let response = await pRequest.get('https://mc.bloom.host/api/client/servers/ad4d3e72/resources') 
    console.log(response.data.attributes.current_state)
    cstate = response.data.attributes.current_state
  
  var statusColor = 16446731
  let currentStatus = ''
    if(cstate == 'starting'){
       currentStatus =  'Starting ⚙'
       statusColor = 16446731
    }
    if (cstate == 'running'){
        currentStatus = 'Online ✅'
        statusColor = 786176
    }
    if (cstate =='offline'||cstate == 'stopped'){
        currentStatus = 'Offline ❌'
        statusColor = 16254496
    }
    if(cstate == 'stopping'){
        currentStatus = 'Stopping ❌'
        statusColor = 16254496
    }
    let stateEmbed = new discord.MessageEmbed().setColor(statusColor).setFooter('Mashiro v1.4 • Hit !ip for the server ip').setTimestamp(new Date()).addField('Status check','Server is currently - '+currentStatus)
    mschannel.send(stateEmbed)
}

    catch(error){
        console.log('Startup status - failed\n\n\n\n')
}   }



bot.on('ready', ()=>{
    var end = new Date().getTime()
    mses = end-sttime

    bot.channels.fetch(process.env.DISCORD_MAIN_CHANNEL_ID)
    mchannel = bot.channels.cache.get(process.env.DISCORD_MAIN_CHANNEL_ID)
    bot_active=true
    bot.user.setActivity("nothing", { //depression noises
        type: "STREAMING",
        url: "https://www.twitch.tv/ribcatcher"
      })
      let startEmbed = new discord.MessageEmbed().setColor(0x0099ff).setTitle('Hello!').setAuthor('Startup complete','https://cdn.discordapp.com/avatars/815713744394125352/728535a99a65d5cfac7be57f5791f5db.png').setFooter('Mashiro v1.4 • Hit !ip for the server ip').addField('All modules loaded.','Time taken: ' + mses + ' ms').setTimestamp(new Date())
      try{
      bot.guilds.fetch('752387939866116156')
      const gfrnGuild = bot.guilds.cache.get('752387939866116156')
      gfrnGuild.members.fetch('815713744394125352')
      const botUserGuildMember = gfrnGuild.members.cache.get('815713744394125352')
      botUserGuildMember.setNickname('Mashiro | Panel Link','Nickname reset function')
      }
    catch(error){
        console.log('Unable to set nick - \n\n\n' + error)
    }
      mchannel.send(startEmbed)
      
      stCommand(mchannel)
      console.log('done')

})
//End startup callback hell





//power commands (start/restart etc.) - http request handler
async function powerCSrv(msg,action){
    msg.react('⚙')
    var request={
        'signal': action
    }
    try{
    msg.react('⚙')
    let response =  await pRequest.post('https://mc.bloom.host/api/client/servers/ad4d3e72/power',request)
    let responseEmbed = new discord.MessageEmbed().setColor(786176).setFooter('Mashiro v1.4 • Hit !ip for the server ip').addField('Server power action','`'+action+'`').setTimestamp(new Date()).setAuthor(msg.author.username,msg.author.displayAvatarURL({dynamic:true,size:256}),msg.author.id)
    
    mchannel.send(responseEmbed)
    msg.reactions.removeAll().then(msg.react('✅'))
    
    console.log('\nReceived:\n'+response)
    }
    catch(error){
        console.log("Failed! This is what I got for you:\n\n"+error+'\n')
        try{
            msg.reations.removeAll().then(msg.react('❌'))
            
        }
        catch(error){
            console.log('\nFurther error while reacting to message:\n\n'+error+'\n')
        }
    }
    
}
// command other than power commands (for console) - http request handler
async function cCommand(msg,params) {
    var request = {
        'command': params
    }

    try
    {
        msg.react('⚙')
        let response = await pRequest.post('https://mc.bloom.host/api/client/servers/ad4d3e72/command',request)
        let commandSentEmbed = new discord.MessageEmbed().setColor(786176).setFooter('Mashiro v1.4 • Hit !ip for the server ip').addField('Command sent','`'+params+'`').setTimestamp(new Date()).setAuthor(msg.author.username,msg.author.displayAvatarURL({dynamic:true,size:256}),msg.author.id)
        msg.reactions.removeAll().then(msg.react('✅'))
        mchannel.send(commandSentEmbed)
        console.log('\nReceived:\n'+response)
    }
    catch(error){
        msg.reply("Failed! This is what I got for you:\n```\n"+error+'\n```')
        try{
            msg.reactions.removeAll().then(msg.react('❌'))
        }
        catch(error2){
            console.log('Further, unable to react to message:\n\n' + error2 + '\n' )
        }
    }
}


bot.on('message', msg =>{ //message handler, callbacks lets goooo
var valid = false //main controller for "if message gets replied to or not"

if(msg.author.id != bot.user.id){
    if(msg.content.toLowerCase()=='noob'){
        msg.reply('No u')
        valid = false
    }
    if(msg.guild == null)
    {
        if(msg.author.id != '309164474244268042'){ //Let rib use commands in dms
            msg.reply('Sorry! This doesn\'t work in DMs!')
            valid = false
            console.log('\nnullGuild message = ' + msg.content + ' - ' + msg.channel.id + ' - ' + msg.author.id + ' - ' + msg.author.username)
        }
        else if (msg.author.id == '309164474244268042'){
            valid = true
            console.log('\nribcatcher DM = ' + msg.content + ' - ' + msg.channel.id + ' - ' + msg.author.id + ' - ' + msg.author.username)
        }
    }
    else{valid = true}
    if(msg.content.startsWith('~')&& msg.content.length>1 && valid){
        var cmdend = msg.content.indexOf(' ')
        var command =''
        var params =''
        if (cmdend == -1)
        {
            command = msg.content.substr(1,msg.content.length-1)
            console.log(command)
            params = ''
            console.log('no params - ' + msg.author.id)
        }
        else
        {
            var command = msg.content.substr(1,cmdend-1)
            var params = msg.content.substr(cmdend+1,msg.content.length)
            console.log(command)  
        }
        if (command == 'restart'||command == 'start' || command == 'stop' || command == 'kill'){
            commandPowerState(msg,command,params)
        }
        if (command == 'command'){
            commandCustom(msg,command,params)
        }
        if(command == 'status'){
            commandStatus(msg,command,params)
        }
    }
}
})

//discord command handlers for permissions, very basic right now. separate from the http request handlers which they call if perms are met(around line 70)

//handler for power state commands (~start,~stop,~restart,~kill)
function commandPowerState(msg,command,params){
    if(msg.author.id == '309164474244268042'){
        if (command=='restart'){
            powerCSrv(msg,'restart')
        }
        if (command=='start'){
            powerCSrv(msg,'start')
        }
        if (command=='stop'){
            powerCSrv(msg,'stop')
        }
        if (command=='kill'){
            powerCSrv(msg,'kill')
        }
    }
        else{
            msg.reply('You are not allowed to run this command!')
            msg.react('❌')
        }
}

function commandStatus(msg,command,params){
    stCommand(msg.channel)
}

// ~command <command without '/' at the start to send to console>
function commandCustom(msg,command,params)
{
    if(msg.author.id == '309164474244268042'|| msg.author.id == '391955706695385089' ){
       cCommand(msg,params)
        }
        else{
            msg.reply('You are not allowed to run this command!')
            msg.react('❌')
        }
}

async function rl(){

readline.question('Bot >', (input) => {
    if (input.length > 24 && input.startsWith('send'))
    {
        try{
            var channelid = input.substr(5,18)
            bot.channels.fetch(channelid)
            var channel = bot.channels.cache.get(channelid)
            channel.send(input.substr(24,input.length))
        }
        catch(error){
            console.log('\nSomething went wrong!\n'+error)
        }
    
    }
    else if(input.toLowerCase() == 'stop'){
        try{
            mchannel.send('Shutdown requested from console. Ending process...', () => {process.exit(0)})
        }
        catch(error){
            console.log('ERROR ON CLEAN EXIT - FAILED TO SEND SHUTDOWN ACKNOWLEDGEMENT\n\n\n\n' + error)
            process.exit(1)
        }
        process.exit(0)
    }
    else if(input.toLowerCase() == 'sendinfoembed'){
     bot.channels.fetch('826705679477506068')   
     var cchannel = bot.channels.cache.get('826705679477506068')
     cchannel.send(UHCembed)
      
    }
    else if (input.toLowerCase() == 'dlm'){
        try{bot.user.lastMessage.fetch()
        bot.user.lastMessage.delete()}
        catch(error){
            console.log('Failed:\n\n'+error+'\n')
        }
    }
    rl()
})
}
rl()