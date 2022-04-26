//log startup time
var startupTimestamp = new Date().getTime()
var trackedMsgs = [] //for kex's reaction log
//import libraries

const fs = require('fs')                              //file system reader
const YAML = require('yaml')                              //yaml parser
const parse = require('discord-command-parser').parse         //discord commmand parser
require('dotenv').config()                            //reads .env file and imports the values into process.env.[]
const discord = require('discord.js')                 //discord bot library
const axios = require('axios').default                //HTTP library

//Permissions loader
var permittedIDS = []
function loadPermissions(){
    let permsFile = fs.readFileSync('./permissions.yml', 'utf8')
    let __permittedIDs = YAML.parse(permsFile).authorised
    permittedIDS = __permittedIDs 
    return __permittedIDs
}

var permittedIDS = loadPermissions()

//Regularly used channels, good to have. Initialised in the function called by bot.on('ready') i.e onReady()
var mainMCChannel
var logsMSGChannel
var logsMCChannel

//rib's discord ID (to append at the bottom of error messages)
var ribDiscordID = '309164474244268042'

//Standard request format for petrodactyl v1.0+ API
const HTTPPanelRequest = axios.create({
    timeout: 2000,
    headers:{
        'Accept':'application/json',
        'Content-Type':'application/json',
        'Authorization':'Bearer '+process.env.PETRO_KEY
    }
})




//create discord client instance
const bot = new discord.Client()

//create crosschat instance
//const crosschatbot = new discord.Client()

//discord login!
bot.login(process.env.DISCORD_BOT_TOKEN)

//crosschat login!
//crosschatbot.login(process.env.DISCORD_CROSSCHAT_BOT_TOKEN)

//Discord connection established
bot.on('ready', async () => {onReady()})

async function onReady(){
    //set the status for swag reasons
    bot.user.setActivity("mc.imakami.ml", { //depression noises
        type: "PLAYING",
      })
    //fetch and cache regularly used channels
    await bot.channels.fetch(process.env.DISCORD_MC_CHANNEL_ID)
    await bot.channels.fetch(process.env.DISCORD_LOGS_CHANNEL_ID)
    await bot.channels.fetch(process.env.DISCORD_MCLOGS_CHANNEL_ID)
    //assign them to vars for easy access
    mainMCChannel = bot.channels.cache.get(process.env.DISCORD_MC_CHANNEL_ID)
    logsMSGChannel = bot.channels.cache.get(process.env.DISCORD_LOGS_CHANNEL_ID)
    logsMCChannel = bot.channels.cache.get(process.env.DISCORD_MCLOGS_CHANNEL_ID)
    //fetch server status to put in the startup embed
    let currentState = await fetchServerStatus(false)    //fetchserverstatus but only request the current_state string (hence we pass 'false' in the params)
    let statusfetchSuccess = true
    let parsedState = {}
    if (currentState == false){
        let errorEmbed = new discord.MessageEmbed().addField('Error while fetching status!','Please report this to <@'+ribDiscordID+'>').setFooter('Mashiro Engine v2.0 • More information in the console').setTimestamp(new Date())
        logsMCChannel.send(errorEmbed)
    }
    else{
        parsedState = parseCurrentState(currentState)
    }
    statusfetchSuccess = true
    initendTimestamp = new Date().getTime()
    let startupTimeTaken =  initendTimestamp - startupTimestamp 
    let startupEmbed = new discord.MessageEmbed().setColor(0x0099ff).setTitle('Hello!').setAuthor('Startup complete','https://cdn.dribbble.com/users/1092738/screenshots/4210641/fire_still_2x.gif?compress=1&resize=400x300').setFooter('Mashiro Engine v2.0').addField('All modules loaded.','Time taken: ' + startupTimeTaken + ' ms').setTimestamp(new Date()).addField((currentState != false)?'Server status':'Error while fetching status!', (currentState != false)?'Server is currently - '+parsedState.status:'Please report this to <@'+ribDiscordID+'>')
    mainMCChannel.send(startupEmbed)
    console.log('\n')
    console.log('done')
    console.log('\n')
}

async function reloadDiscordServices(){
    await bot.user.setActivity("nothing", { //depression noises
        type: "STREAMING",
        url: "https://www.twitch.tv/ribcatcher"
      })

    //fetch and cache regularly used channels
    await bot.channels.fetch(process.env.DISCORD_MC_CHANNEL_ID)
    await bot.channels.fetch(process.env.DISCORD_LOGS_CHANNEL_ID)
    await bot.channels.fetch(process.env.DISCORD_MCLOGS_CHANNEL_ID)
    //assign them to vars for easy access
    mainMCChannel = bot.channels.cache.get(process.env.DISCORD_MC_CHANNEL_ID)
    logsMSGChannel = bot.channels.cache.get(process.env.DISCORD_LOGS_CHANNEL_ID)
    logsMCChannel = bot.channels.cache.get(process.env.DISCORD_MCLOGS_CHANNEL_ID)

}


//Fetches the minecraft server's status (starting, started, stopping, stopped) as well as the option to return the entire object that includes stuff like RAM and CPU usage as well.
async function fetchServerStatus(returnFullObject = false){
    try{

        //query to panel (Petro API)
        let currentResourceUsage = await HTTPPanelRequest.get('https://mc.bloom.host/api/client/servers/20bbfc96/resources')
        
        //do you want all the data or only the current_state? 
        //Full object includes stuff like RAM and CPU usage as well.
        if (returnFullObject){
            return currentResourceUsage
        }

        else{
            return currentResourceUsage.data.attributes.current_state
        }
        
    }
    catch(error){
        console.log('[UNIX TIME:'+new Date().getTime() +']: Error in fetchServerStatus():\n\n' + error + '\n\n[--END--]\n\n')
        return false
    }
}

function parseCurrentState(cstate = 'stopped'){
    let currentStatus = ''
    let statusColor = 16254496

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
    
    
    
    let parsedResult = {
        color: statusColor,
        status: currentStatus
    }

    return parsedResult
}

//FINALLY we get to the message handler.
bot.on('message', msg =>{messageHandler(msg)})

//ReactionLog that Kex wanted
/*bot.on('messageReactionAdd', async (reaction,user) =>{
    let tracked = false
    let requestedBy = null
    for (i=0; i<trackedMsgs.length; i++){if(trackedMsgs[i].messageID == reaction.message.id){
        tracked=true
        requestedBy = trackedMsgs[i].requestedBy
    }
}
    trackOutHandler(reaction,user,'add',tracked,requestedBy)
})

bot.on('messageReactionRemove', async (reaction, user)=> {
    let tracked = false
    let requestedBy = null
    for (i=0; i<trackedMsgs.length; i++){if(trackedMsgs[i].messageID == reaction.message.id){
        tracked=true
        requestedBy = trackedMsgs[i].requestedBy
    }
}    trackOutHandler(reaction,user,'remove',tracked,requestedBy)
})

bot.on('messageReactionRemoveAll', async (message) => {
    let tracked = false
    let requestedBy = null
    for (i=0; i<trackedMsgs.length; i++){if(trackedMsgs[i].messageID == message.id){
        tracked=true
        requestedBy = trackedMsgs[i].requestedBy
    }
}    trackOutHandler(message, null, 'rall',tracked,requestedBy)
})

bot.on('messageReactionRemoveEmoji', async (reaction) =>{
let tracked = false
let requestedBy = null
for (i=0; i<trackedMsgs.length; i++){if(trackedMsgs[i].messageID == reaction.message.id){
    tracked=true
    requestedBy = trackedMsgs[i].requestedBy
}
}    trackOutHandler(reaction, null, 'remj',tracked,requestedBy)
})

async function trackOutHandler(param1, user, type, tracked, requestedBy){
if(tracked){
if (type == 'remove' || type == 'add'){
console.log('[UNIX TIME:'+new Date().getTime() +']: Single reaction ' + type + ' event\n\n' + 'Caused by - ' + user.username +' ['+ user.id + '] on '+ param1.message.id +' in '+param1.message.channel.id+'.\n\nReaction: '+param1.emoji.name+' ['+param1.emoji.id+']\n\nTrack created by: '+requestedBy+'.\n\n[--END--]\n\n')
}
else if(type == 'rall'){
console.log('[UNIX TIME:'+new Date().getTime() +']: Remove all reactions event\n\n' + 'on  ' + param1.id + ' in '+param1.channel.id+'.\n\nTrack created by: '+requestedBy+'.\n\n[--END--]\n\n')
}
else if(type == 'remj'){
console.log('[UNIX TIME:'+new Date().getTime() +']: Emoji reaction removed event\n\n' + 'on  ' + param1.message.id +' in '+param1.message.channel.id+'.\n\nTrack created by: '+requestedBy+'.\n\n[--END--]\n\n')
}
}
}

//End reaction log special functions
async function suggestionCheck(message){
    try{
        if (message.channel.id == process.env.SUGGESTION_CHANNEL_ID && message.content.toLowerCase().startsWith('[s]')){
            message.react('<:approve:865208398504919040>').then(message.react('<:deny:865208398333345814>'))
            return true
        }
        else if ((message.channel.id == process.env.SUGGESTION_CHANNEL_ID && message.content.toLowerCase().startsWith('[a]')) || message.member.roles.cache.some(role => role.name === 'Immunity') || message.member.roles.cache.some(role => role.name === 'Bots')){
            return false
        }
         else if(message.channel.id == process.env.SUGGESTION_CHANNEL_ID){
              message.delete()
              let replySugg = await message.reply('Please follow the suggestion format! (See pins)').then(setTimeout(() => {replySugg.delete()}, 3000))
              return true
        }
    }
    catch(error){
        console.log('[UNIX TIME:'+new Date().getTime() +']: Error in suggestionCheck():\n\n' + error + '\n\n[--END--]\n\n')
        return false
    } 
}
*/
//COugh I mean this is the message handler over here
async function messageHandler(message){
    let parsedMsg = parse(message,'~')
    
    if(parsedMsg.command == 'status'){
        let authorised = true  //anyone can run the status command!
        statusCommand_Executor(message,parsedMsg,authorised)
    }
    if(parsedMsg.command == 'reload'){
        let authorised = checkPerms(message, parsedMsg)
        reloadCommand_Executor(message, parsedMsg, authorised)
    }
    if(parsedMsg.command == 'command'){
        let authorised = checkPerms(message, parsedMsg)
        commandCommand_Executor(message, parsedMsg, authorised)
    }
    if(parsedMsg.command == 'restart' || parsedMsg.command == 'start' || parsedMsg.command == 'stop' || parsedMsg.command == 'kill'){
        let authorised = checkPerms(message, parsedMsg)
        powerCommand_Executor(message, parsedMsg, authorised)
    }
    if(parsedMsg.command == 'ping'){
        let authorised = true
        pingCommand_Executor(message, parsedMsg, authorised)
    }
    if(parsedMsg.command == 'help'){
        let authorised = checkPerms(message,parsedMsg, 'help')
        helpCommand_Executor(message, parsedMsg, authorised)
    }
    /*
    if(parsedMsg.command == 'track'){
        let authorised = checkPerms(message, parsedMsg, 'tracker')
        trackCommand_Executor(message, parsedMsg, authorised)
    }
    if(parsedMsg.command == 'resettracks'){
        let authorised = checkPerms(message, parsedMsg, 'resettrackers')
        trackResetCommand_Executor(message, parsedMsg, authorised)
    }
    */
}

//check whether executor has permissions. Returns Bool.

function checkPerms(message, parsedMsg, authtype = 'mc'){
    let authorised = false
    if (permittedIDS[authtype] != null){
        console.log('[UNIX TIME:'+new Date().getTime() +']: VALID AUTH REQUEST \n\n[' + message.author.id + ']['+authtype+']\n\n[--END--]\n\n')
        for(i=0; i<(permittedIDS[authtype]).length; i++){
            
        if(message.author.id == (permittedIDS[authtype])[i]){
            console.log('[UNIX TIME:'+new Date().getTime() +']: AUTH SUCCESS \n\n[' + message.author.id + ']['+authtype+']\n\n[--END--]\n\n')
            authorised = true
        }
        }
        
    }
    if (authorised == false) {console.log('[UNIX TIME:'+new Date().getTime() +']: AUTH FAIL \n\n[' + message.author.id + ']['+authtype+']\n\n[--END--]\n\n')}
    return authorised
}
  


//MC command executors

async function statusCommand_Executor(message, parsedMsg, authorised){
    if(authorised){
        let currentState = await fetchServerStatus(false)
        let parsedState = {}
        if (currentState == false){
            let errorEmbed = new discord.MessageEmbed().addField('Error while fetching status!','Please report this to <@'+ribDiscordID+'>').setFooter('Mashiro Engine v2.0 • More information in the console').setTimestamp(new Date())
            logsMCChannel.send(errorEmbed)
            message.react('❌')
        }
        else {
            parsedState = parseCurrentState(currentState)
            let stateEmbed = new discord.MessageEmbed().setColor(parsedState.color).setFooter('Mashiro Engine v2.0').setTimestamp(new Date()).addField('Status check','Server is currently - '+parsedState.status)
            message.channel.send(stateEmbed)
        }
        let logEmbed = new discord.MessageEmbed().setTimestamp(new Date()).addField('Status command was run:','Click [here]('+message.url+') to jump to message.').setFooter('Mashiro Engine v2.0 • Sender\'s id was '+message.author.id).setAuthor(message.author.username,message.author.displayAvatarURL({dynamic:true,size:256}))
        logsMCChannel.send(logEmbed)
    }
}

async function reloadCommand_Executor(message, parsedMsg, authorised){
    if(authorised){
        await message.react('⚙')
        let reloadStart = new Date().getTime()
        loadPermissions()
        await reloadDiscordServices()
        let reloadEnd = new Date().getTime()
        let reloadTime = reloadEnd - reloadStart
        let responseEmbed = new discord.MessageEmbed().setTimestamp(new Date()).addField('Reload complete!', 'Took '+reloadTime+'ms.').setColor(786176).setFooter('Mashiro Engine v2.0')
        message.channel.send(responseEmbed)
        let logEmbed = new discord.MessageEmbed().setTimestamp(new Date()).addField('Bot reloaded!','Click [here]('+message.url+') to jump to message.').setFooter('Mashiro Engine v2.0 • Sender\'s id was '+message.author.id).setAuthor(message.author.username,message.author.displayAvatarURL({dynamic:true,size:256}))
        logsMCChannel.send(logEmbed)
        message.reactions.removeAll().then(message.react('✅'))
    }
    else{
        let logEmbed = new discord.MessageEmbed().setTimestamp(new Date()).addField('['+parsedMsg.command + '] No permissions error:','Click [here]('+message.url+') to jump to message.').setFooter('Mashiro Engine v2.0 • Sender\'s id was '+message.author.id).setAuthor(message.author.username,message.author.displayAvatarURL({dynamic:true,size:256})).setColor(16254496)
        logsMCChannel.send(logEmbed)
        message.react('❌')
    }
}

async function commandCommand_Executor(message, parsedMsg, authorised){
    if(authorised){
        await message.react('⚙')
        let request = {
            'command': parsedMsg.body
        }
        try{
            await HTTPPanelRequest.post('https://mc.bloom.host/api/client/servers/20bbfc96/command',request)
            message.reactions.removeAll().then(message.react('✅'))
            let logEmbed = new discord.MessageEmbed().setTimestamp(new Date()).addField('MC Command sent!','Click [here]('+message.url+') to jump to message.').addField('Content:',parsedMsg.body).setFooter('Mashiro Engine v2.0 • Sender\'s id was '+message.author.id).setAuthor(message.author.username,message.author.displayAvatarURL({dynamic:true,size:256})).setColor(786176)
            logsMCChannel.send(logEmbed)
        }
        catch(error){
            if (parsedMsg.body == ''){
                console.log('[UNIX TIME:'+new Date().getTime() +']: Error in commandCommand_Executor():\n\n' + error + '\n\n[--END--]\n\n')
                message.reply(' specify a command to send.')
                let errorEmbed = new discord.MessageEmbed().addField('Error while sending command!','Empty command field!\nIf this isn\'t true, please report this to <@'+ribDiscordID+'>').setFooter('Mashiro Engine v2.0 • More information in the console').setTimestamp(new Date())
                logsMCChannel.send(errorEmbed)
            }
            else{
                console.log('[UNIX TIME:'+new Date().getTime() +']: Error in commandCommand_Executor():\n\n' + error + '\n\n[--END--]\n\n')
                let errorEmbed = new discord.MessageEmbed().addField('Error while sending command!','Please report this to <@'+ribDiscordID+'>').setFooter('Mashiro Engine v2.0 • More information in the console').setTimestamp(new Date())
                logsMCChannel.send(errorEmbed)
            }
            message.reactions.removeAll().then(message.react('❌'))
        }

    }
    else{
        let logEmbed = new discord.MessageEmbed().setTimestamp(new Date()).addField('['+parsedMsg.command + '] No permissions error:','Click [here]('+message.url+') to jump to message.').setFooter('Mashiro Engine v2.0 • Sender\'s id was '+message.author.id).setAuthor(message.author.username,message.author.displayAvatarURL({dynamic:true,size:256})).setColor(16254496)
        logsMCChannel.send(logEmbed)
    }
}

async function powerCommand_Executor(message, parsedMsg, authorised){
    if(authorised){
        await message.react('⚙')
        let request = {
            'signal': parsedMsg.command
        }
        try{
            await HTTPPanelRequest.post('https://mc.bloom.host/api/client/servers/20bbfc96/power',request)
            let logEmbed = new discord.MessageEmbed().setTimestamp(new Date()).addField('['+parsedMsg.command+'] MC Power action sent!','Click [here]('+message.url+') to jump to message.').addField('Reason:',(parsedMsg.body == '')?'None specified.':parsedMsg.body).setFooter('Mashiro Engine v2.0 • Sender\'s id was '+message.author.id).setAuthor(message.author.username,message.author.displayAvatarURL({dynamic:true,size:256})).setColor(786176)
            logsMCChannel.send(logEmbed)
            message.reactions.removeAll().then(message.react('✅'))
        }
        catch(error){
            console.log('[UNIX TIME:'+new Date().getTime() +']: Error in powerCommand_Executor():\n\n' + error + '\n\n[--END--]\n\n')
            let errorEmbed = new discord.MessageEmbed().addField('Error while sending power action!','Please report this to <@'+ribDiscordID+'>').setFooter('Mashiro Engine v2.0 • More information in the console').setTimestamp(new Date())
            logsMCChannel.send(errorEmbed)
            message.reactions.removeAll().then(message.react('❌'))
        }
    }
    else{
        let logEmbed = new discord.MessageEmbed().setTimestamp(new Date()).addField('['+parsedMsg.command + '] No permissions error:','Click [here]('+message.url+') to jump to message.').setFooter('Mashiro Engine v2.0 • Sender\'s id was '+message.author.id).setAuthor(message.author.username,message.author.displayAvatarURL({dynamic:true,size:256})).setColor(16254496)
        logsMCChannel.send(logEmbed)
        message.reactions.removeAll().then(message.react('❌'))
    }
}

async function pingCommand_Executor(message, parsedMsg, authorised){
    try{
    
        let pingEmbed = new discord.MessageEmbed()
        .addField('Pong!','One-way ping took ' + (new Date().getTime() - message.createdTimestamp)+'ms.')
        .setFooter('Mashiro Engine v2.0')
        .setColor(786176)
        .setTimestamp(new Date())

        message.channel.send(pingEmbed)
        let logEmbed = new discord.MessageEmbed().setTimestamp(new Date()).addField('Ping command was run:','Click [here]('+message.url+') to jump to message.').setFooter('Mashiro Engine v2.0 • Sender\'s id was '+message.author.id).setAuthor(message.author.username,message.author.displayAvatarURL({dynamic:true,size:256}))
        logsMCChannel.send(logEmbed)
    }
    catch(error){
        console.log('[UNIX TIME:'+new Date().getTime() +']: Error in pingCommand_Executor():\n\n' + error + '\n\n[--END--]\n\n')
    }
}

async function helpCommand_Executor(message, parsedMsg, authorised){
    try{
        let helpEmbed = new discord.MessageEmbed()
        .setTitle('Hello there!')
        .addField('status','Shows the current status of the minecraft server.')
        .addField('ping','Shows latency to discord.')
        .setDescription('Prefix: `~`')
        .setColor(786176)
        if (authorised){
            helpEmbed.addField('start/stop/restart/kill [optional reason]','Run a server power action. Reason is optional.')
            .addField('command <command>','Send a command to the minecraft server console.\n')
            .addField('reload','Reload the bot.\n')
            //.addField('track <message ID>','Tracks all emoji reactions on that message in the bot console.\nUse `~resettracks` to remove all tracked messages.\nResets on bot restart.\n*Bot administrator command.*')
            .setFooter('Mashiro Engine v2.0')
            .setTimestamp(new Date())
            .setColor(12390624)
        }

        message.channel.send(helpEmbed)
        let logEmbed = new discord.MessageEmbed()
        .setTimestamp(new Date())
        .addField('Help command was run:','Click [here]('+message.url+') to jump to message.')
        .addField('Admin commands shown?',(authorised)?'Yes.':'No.')
        .setFooter('Mashiro Engine v2.0 • Sender\'s id was '+message.author.id)
        .setAuthor(message.author.username,message.author.displayAvatarURL({dynamic:true,size:256}))
        logsMCChannel.send(logEmbed)
    }
    catch(error){
        console.log('[UNIX TIME:'+new Date().getTime() +']: Error in helpCommand_Executor():\n\n' + error + '\n\n[--END--]\n\n')   
    }
}

//ReactionLog thing

async function trackCommand_Executor(message, parsedMsg, authorised){
    try{
        if(authorised){
            await message.channel.messages.fetch(parsedMsg.body)
            console.log('\n\ndebug:'+parsedMsg.body+'\n\n')
            let messageObjectForTesting =  await message.channel.messages.cache.get(parsedMsg.body)
            if (messageObjectForTesting != null){
                message.react('✅')
                let trackObject = {
                    requestedBy: message.author.id,
                    messageID: messageObjectForTesting.id
                }
                trackedMsgs.push(trackObject)
                let logEmbed = new discord.MessageEmbed().setTimestamp(new Date()).addField('Tracker added','Click [here]('+messageObjectForTesting.url+') to jump to tracker.').addField('Command message:','Click [here]('+message.url+') to jump to command.').setFooter('Mashiro Engine v2.0 • Sender\'s id was '+message.author.id).setAuthor(message.author.username,message.author.displayAvatarURL({dynamic:true,size:256}))
                logsMSGChannel.send(logEmbed)
                console.log('[UNIX TIME:'+new Date().getTime() +']:\n\nTrack created by '+message.author.id+' on '+parsedMsg.body+'.\n\n[--END--]\n\n')
            }
            else{
                message.react('❌')
                message.reply('No message found with that ID in this channel.')
                let logEmbed = new discord.MessageEmbed().setTimestamp(new Date()).addField('Tracker not added (404):','Click [here]('+message.url+') to jump to command.').setFooter('Mashiro Engine v2.0 • Sender\'s id was '+message.author.id).setAuthor(message.author.username,message.author.displayAvatarURL({dynamic:true,size:256}))
                logsMSGChannel.send(logEmbed)
            }
        }
        else{
        let logEmbed = new discord.MessageEmbed().setTimestamp(new Date()).addField('['+parsedMsg.command + '] No permissions error:','Click [here]('+message.url+') to jump to message.').setFooter('Mashiro Engine v2.0 • Sender\'s id was '+message.author.id).setAuthor(message.author.username,message.author.displayAvatarURL({dynamic:true,size:256})).setColor(16254496)
        logsMSGChannel.send(logEmbed)
        message.react('❌')
        }
    }
    catch(error){
        console.log('[UNIX TIME:'+new Date().getTime() +']: Error in trackCommand_Executor():\n\n' + error + '\n\n[--END--]\n\n')
        try{
        message.reactions.removeAll().then(message.react('❌'))
        }
        catch(error){
            console.log('[UNIX TIME:'+new Date().getTime() +']: Error in trackCommand_Executor() error reaction response:\n\n' + error + '\n\n[--END--]\n\n')
        }
    }
}

async function trackResetCommand_Executor(message, parsedMsg, authorised){
    try{
        if(authorised){
            trackedMsgs = [] //empty list of tracked message ids
            message.react('✅')
            let logEmbed = new discord.MessageEmbed().setTimestamp(new Date()).addField('All trackers have been reset!','Click [here]('+message.url+') to jump to command.').setFooter('Mashiro Engine v2.0 • Sender\'s id was '+message.author.id).setAuthor(message.author.username,message.author.displayAvatarURL({dynamic:true,size:256}))
            logsMSGChannel.send(logEmbed)
        }
        else{
            let logEmbed = new discord.MessageEmbed().setTimestamp(new Date()).addField('['+parsedMsg.command + '] No permissions error:','Click [here]('+message.url+') to jump to message.').setFooter('Mashiro Engine v2.0 • Sender\'s id was '+message.author.id).setAuthor(message.author.username,message.author.displayAvatarURL({dynamic:true,size:256})).setColor(16254496)
            logsMSGChannel.send(logEmbed)
            message.react('❌')
        }
    
    }
    catch(error){
    console.log('[UNIX TIME:'+new Date().getTime() +']: Error in trackResetCommand_Executor():\n\n' + error + '\n\n[--END--]\n\n')
    }
}
/*
async function hcmRaidCommand_Executor(message, parsedMsg, authorised){
//quick and dirty -- only for the select few -- troll command
    if (authorised){
        try{
            if(message.member.voice.channel.id != '853366241224687616' && message.member.voice.channel.id != null) 
            {
                message.member.voice.setChannel('853366241224687616')
                message.react('✅')
            }
            else{
                message.react('❌')
            }
        }
        catch (error){
            console.log('[UNIX TIME:'+new Date().getTime() +']: Error in hcmRaidCommand_Executor():\n\n' + error + '\n\n[--END--]\n\n')
            message.react('❌')
        }
    }
    else{
        message.react('❌')
    }
}

*/


//crosschat code - remove/comment out to disable
/*
var SSCrosschatChannel
var JKCrosschatChannel


crosschatbot.on('ready',() => {
    onCCReady()
})

async function onCCReady(){
    await crosschatbot.channels.fetch(process.env.DISCORD_MC_CHANNEL_ID)  
    JKCrosschatChannel = crosschatbot.channels.cache.get(process.env.DISCORD_MC_CHANNEL_ID)

    await crosschatbot.channels.fetch(process.env.DISCORD_SS_CROSSCHAT_CHANNEL_ID)
    SSCrosschatChannel = crosschatbot.channels.cache.get(process.env.DISCORD_SS_CROSSCHAT_CHANNEL_ID)
}

crosschatbot.on('message', msg => {crosschatHandler(msg)})

async function crosschatHandler(message){
    if(message.author.id != crosschatbot.user.id && message.channel.id == process.env.DISCORD_SS_CROSSCHAT_CHANNEL_ID){ 
        JKCrosschatChannel.send(message.author.username + ' » ' + message.content)
    }
    if(message.author.id != crosschatbot.user.id && message.channel.id == process.env.DISCORD_MC_CHANNEL_ID){
        if (message.content != ''&& message.author.id != bot.user.id){
        SSCrosschatChannel.send('**[JK] ' + message.author.username + ' »** ' + message.content)
        }
        if (message.content != ''&& message.author.id == bot.user.id){
            SSCrosschatChannel.send('**[MC]** ' + message.content)
            }
        if (message.embeds[0] != null && message.author.id == bot.user.id){
        SSCrosschatChannel.send(message.embeds[0])
        }
    }
}
*/